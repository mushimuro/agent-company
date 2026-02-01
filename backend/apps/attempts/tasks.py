from celery import shared_task
from django.conf import settings
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import httpx
import hashlib
import time


@shared_task(bind=True, max_retries=3)
def start_attempt_task(self, attempt_id: str):
    """
    Execute an attempt by calling LDA agent/run endpoint.
    Streams events via WebSocket to connected clients.

    Args:
        attempt_id: UUID of the attempt to execute

    Returns:
        dict: Execution result with status and details
    """
    from apps.attempts.models import Attempt, AttemptEvent, AttemptGateResult
    from apps.local_access.models import WritableRoot

    try:
        attempt = Attempt.objects.select_related(
            'task', 'task__project'
        ).get(id=attempt_id)
    except Attempt.DoesNotExist:
        return {'error': 'Attempt not found', 'attempt_id': attempt_id}

    channel_layer = get_channel_layer()
    group_name = f'attempt_{attempt_id}'
    project_group_name = f'project_{attempt.task.project_id}'

    def send_event(event_type: str, message: str, metadata: dict = None):
        """Send event to WebSocket and save to database."""
        # Save to database
        AttemptEvent.objects.create(
            attempt=attempt,
            event_type=event_type,
            message=message,
            metadata=metadata or {}
        )
        # Send via WebSocket
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'attempt_event',
                    'event_type': event_type,
                    'message': message,
                    'metadata': metadata or {},
                    'timestamp': timezone.now().isoformat()
                }
            )

    def broadcast_task_update(task):
        """Broadcast task status change to project group for real-time UI updates."""
        if channel_layer:
            from apps.tasks.serializers import TaskSerializer
            import json
            # Serialize to JSON and back to ensure all UUIDs become strings
            task_data = json.loads(json.dumps(TaskSerializer(task).data, default=str))
            async_to_sync(channel_layer.group_send)(
                project_group_name,
                {
                    'type': 'task_update',
                    'task': task_data,
                    'action': 'status_changed'
                }
            )

    try:
        # Update status to RUNNING
        attempt.status = 'RUNNING'
        attempt.started_at = timezone.now()
        attempt.save()

        send_event('STATUS', f'Starting {attempt.agent_role} agent execution')

        # Get task and project data
        task = attempt.task
        project = task.project

        # Get writable roots for this user
        writable_roots = list(
            WritableRoot.objects.filter(
                owner=project.owner,
                is_active=True
            ).values_list('path', flat=True)
        )

        # Build LDA request
        from apps.local_access.lda_client import call_lda
        
        # Ensure acceptance_criteria is a proper list (not the list callable)
        acceptance_criteria = task.acceptance_criteria
        if not isinstance(acceptance_criteria, list):
            acceptance_criteria = []
        
        request_data = {
            'attempt_id': str(attempt.id),
            'task': {
                'id': str(task.id),
                'title': task.title,
                'description': task.description,
                'agent_role': task.agent_role,
                'acceptance_criteria': acceptance_criteria,
            },
            'project': {
                'name': project.name,
                'description': project.description or '',
                'repo_path': project.repo_path,
                'config': project.config or {},
            },
            'writable_roots': writable_roots,
            'model': 'gemini-2.5-flash'  # Default model
        }

        send_event('LOG', f'Calling LDA with task: {task.title}')

        # Call LDA agent/run endpoint with proper authentication
        response = call_lda(
            endpoint="/api/v1/agent/run",
            data=request_data,
            timeout=600.0  # 10 minute timeout for agent execution
        )
        response.raise_for_status()
        result = response.json()

        # Process result
        if result.get('success'):
            attempt.status = 'SUCCESS'
            attempt.git_branch = result.get('git_branch', '')
            attempt.worktree_path = result.get('worktree_path', '')
            attempt.diff = result.get('diff', '')
            attempt.files_changed = result.get('files_changed', [])
            attempt.result = result.get('output', '')

            send_event('STATUS', 'Agent execution completed successfully')

            # Save quality gate results
            gate_results = result.get('gate_results', {})
            if gate_results:
                for gate_type, gate_data in gate_results.items():
                    if isinstance(gate_data, dict):
                        AttemptGateResult.objects.create(
                            attempt=attempt,
                            gate_type=gate_type.upper(),
                            status='PASSED' if gate_data.get('passed') else 'FAILED',
                            output=gate_data.get('output', ''),
                            duration_seconds=gate_data.get('duration')
                        )
                        send_event(
                            'PROGRESS',
                            f'{gate_type} gate: {"PASSED" if gate_data.get("passed") else "FAILED"}',
                            {'gate_type': gate_type, 'passed': gate_data.get('passed')}
                        )
        else:
            attempt.status = 'FAILED'
            attempt.error_message = result.get('error', 'Unknown error')
            send_event('ERROR', f'Agent execution failed: {attempt.error_message}')

        attempt.completed_at = timezone.now()
        attempt.save()

        # Update task status
        if attempt.status == 'SUCCESS':
            task.status = 'IN_REVIEW'
        else:
            task.status = 'TODO'
        task.save()
        broadcast_task_update(task)

        # Note: We do NOT auto-trigger dependent tasks here.
        # The task moves to IN_REVIEW where the user must approve it first.
        # Only after approval (via the approve endpoint) should dependent tasks become startable.

        return {
            'attempt_id': str(attempt.id),
            'status': attempt.status,
            'git_branch': attempt.git_branch,
            'files_changed': attempt.files_changed
        }

    except httpx.HTTPStatusError as e:
        error_msg = f'LDA HTTP error: {e.response.status_code} - {e.response.text}'
        attempt.status = 'FAILED'
        attempt.error_message = error_msg
        attempt.completed_at = timezone.now()
        attempt.save()

        attempt.task.status = 'TODO'
        attempt.task.save()
        broadcast_task_update(attempt.task)

        send_event('ERROR', error_msg)
        return {'attempt_id': str(attempt.id), 'error': error_msg}

    except httpx.RequestError as e:
        error_msg = f'Cannot connect to LDA: {str(e)}'
        attempt.status = 'FAILED'
        attempt.error_message = error_msg
        attempt.completed_at = timezone.now()
        attempt.save()

        attempt.task.status = 'TODO'
        attempt.task.save()
        broadcast_task_update(attempt.task)

        send_event('ERROR', error_msg)
        raise self.retry(exc=e, countdown=30)

    except Exception as e:
        error_msg = f'Unexpected error: {str(e)}'
        attempt.status = 'FAILED'
        attempt.error_message = error_msg
        attempt.completed_at = timezone.now()
        attempt.save()

        attempt.task.status = 'TODO'
        attempt.task.save()
        broadcast_task_update(attempt.task)

        send_event('ERROR', error_msg)
        return {'attempt_id': str(attempt.id), 'error': error_msg}


@shared_task
def cleanup_old_worktrees():
    """
    Periodic task to cleanup orphaned worktrees.
    Runs daily via Celery Beat.
    """
    from apps.attempts.models import Attempt
    from datetime import timedelta

    # Find attempts with worktrees older than 7 days that aren't active
    cutoff = timezone.now() - timedelta(days=7)
    old_attempts = Attempt.objects.filter(
        worktree_path__isnull=False,
        completed_at__lt=cutoff,
        status__in=['APPROVED', 'REJECTED', 'CANCELLED', 'FAILED']
    ).exclude(worktree_path='')

    from apps.local_access.lda_client import call_lda_safe
    
    cleaned = 0
    for attempt in old_attempts:
        try:
            result = call_lda_safe(
                endpoint="/api/v1/git/cleanup",
                data={
                    'repo_path': attempt.task.project.repo_path,
                    'worktree_path': attempt.worktree_path
                },
                timeout=30.0
            )
            if result:
                attempt.worktree_path = ''
                attempt.save()
                cleaned += 1
        except Exception:
            pass

    return {'cleaned_worktrees': cleaned}
