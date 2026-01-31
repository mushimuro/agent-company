"""
Execution Coordinator - Orchestrates parallel task execution.

Manages concurrent task execution with proper dependency ordering,
concurrency limits, and automatic triggering of dependent tasks.
"""
import logging
from typing import List, Dict, Any, Optional, Set
from django.db import transaction
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from apps.tasks.models import Task
from apps.tasks.utils import DependencyGraph

logger = logging.getLogger(__name__)

# Maximum concurrent agent executions
MAX_CONCURRENT = getattr(settings, 'MAX_CONCURRENT_AGENTS', 4)


class ExecutionCoordinator:
    """
    Coordinates parallel execution of project tasks.
    
    Features:
    - Respects task dependencies (waits for prerequisites)
    - Limits concurrent executions (default: 4)
    - Automatically triggers ready tasks after completion
    - Provides execution status and metrics
    """
    
    def __init__(self, project_id: str, user):
        """
        Initialize coordinator for a project.
        
        Args:
            project_id: UUID of the project
            user: User requesting execution
        """
        self.project_id = project_id
        self.user = user
        self._graph: Optional[DependencyGraph] = None
    
    def _broadcast_task_update(self, task):
        """Broadcast task status change to project WebSocket group."""
        channel_layer = get_channel_layer()
        if channel_layer:
            from apps.tasks.serializers import TaskSerializer
            import json
            # Serialize to JSON and back to ensure all UUIDs become strings
            task_data = json.loads(json.dumps(TaskSerializer(task).data, default=str))
            async_to_sync(channel_layer.group_send)(
                f'project_{self.project_id}',
                {
                    'type': 'task_update',
                    'task': task_data,
                    'action': 'status_changed'
                }
            )
    
    def _build_graph(self) -> DependencyGraph:
        """Build/refresh the dependency graph for project tasks."""
        tasks = Task.objects.filter(
            project_id=self.project_id
        ).values('id', 'title', 'status', 'agent_role', 'priority', 'dependencies')
        
        tasks_list = [
            {
                'id': str(t['id']),
                'title': t['title'],
                'status': t['status'],
                'agent_role': t['agent_role'],
                'priority': t['priority'],
                'dependencies': [str(d) for d in (t['dependencies'] or [])]
            }
            for t in tasks
        ]
        
        graph = DependencyGraph()
        graph.build_graph(tasks_list)
        self._graph = graph
        return graph
    
    def get_current_executing_count(self) -> int:
        """Get number of currently executing tasks in project."""
        return Task.objects.filter(
            project_id=self.project_id,
            status='IN_PROGRESS'
        ).count()
    
    def get_available_slots(self) -> int:
        """Get number of available execution slots."""
        current = self.get_current_executing_count()
        return max(0, MAX_CONCURRENT - current)
    
    def get_ready_tasks(self) -> List[Task]:
        """
        Get tasks ready for execution.
        
        Returns tasks that:
        - Are in TODO status
        - Have all dependencies completed (DONE)
        - Are sorted by priority (lower number = higher priority)
        """
        graph = self._build_graph()
        ready_info = graph.get_ready_tasks()
        
        if not ready_info:
            return []
        
        # Get actual Task objects
        ready_ids = [r['id'] for r in ready_info]
        tasks = Task.objects.filter(id__in=ready_ids).order_by('priority')
        
        return list(tasks)
    
    def schedule_project_tasks(self) -> Dict[str, Any]:
        """
        Schedule ready tasks for execution up to concurrency limit.
        
        Returns:
            Dict with:
            - scheduled: List of task IDs that were scheduled
            - already_running: Count of already running tasks
            - waiting: Count of tasks waiting for dependencies
            - completed: Count of completed tasks
            - errors: Any errors encountered
        """
        from apps.attempts.models import Attempt
        from apps.attempts.tasks import start_attempt_task
        
        result = {
            'scheduled': [],
            'already_running': 0,
            'waiting': 0,
            'completed': 0,
            'errors': []
        }
        
        # Get current state
        all_tasks = Task.objects.filter(project_id=self.project_id)
        result['completed'] = all_tasks.filter(status='DONE').count()
        result['already_running'] = all_tasks.filter(status='IN_PROGRESS').count()
        
        # Calculate available slots
        available_slots = self.get_available_slots()
        
        if available_slots <= 0:
            logger.info(f"No available slots. Max concurrent: {MAX_CONCURRENT}")
            return result
        
        # Get ready tasks
        ready_tasks = self.get_ready_tasks()
        result['waiting'] = all_tasks.filter(status='TODO').count() - len(ready_tasks)
        
        if not ready_tasks:
            logger.info("No tasks ready for execution")
            return result
        
        # Schedule up to available slots
        tasks_to_schedule = ready_tasks[:available_slots]
        
        for task in tasks_to_schedule:
            try:
                # Create attempt and trigger execution
                with transaction.atomic():
                    attempt = Attempt.objects.create(
                        task=task,
                        status='QUEUED'
                    )
                    
                    # Update task status
                    task.status = 'IN_PROGRESS'
                    task.save()
                    
                    # Broadcast task update via WebSocket
                    self._broadcast_task_update(task)
                    
                    # Trigger Celery task
                    start_attempt_task.delay(str(attempt.id))
                    
                    result['scheduled'].append({
                        'task_id': str(task.id),
                        'task_title': task.title,
                        'attempt_id': str(attempt.id),
                        'agent_role': task.agent_role
                    })
                    
                    logger.info(f"Scheduled task {task.id} ({task.title})")
                    
            except Exception as e:
                error_msg = f"Failed to schedule task {task.id}: {str(e)}"
                logger.error(error_msg)
                result['errors'].append(error_msg)
        
        return result
    
    def on_attempt_complete(self, attempt_id: str, success: bool) -> Dict[str, Any]:
        """
        Called when an attempt completes. Triggers next ready tasks.
        
        Args:
            attempt_id: ID of completed attempt
            success: Whether attempt succeeded
        
        Returns:
            Dict with info about newly scheduled tasks
        """
        from apps.attempts.models import Attempt
        
        logger.info(f"Attempt {attempt_id} completed with success={success}")
        
        result = {
            'attempt_id': attempt_id,
            'success': success,
            'newly_scheduled': []
        }
        
        try:
            attempt = Attempt.objects.select_related('task').get(id=attempt_id)
            task = attempt.task
            
            # Update task status based on attempt result
            if success:
                task.status = 'DONE'
            else:
                task.status = 'FAILED'
            task.save()
            
            # If successful, check for and schedule dependent tasks
            if success:
                # Refresh graph and schedule new tasks
                schedule_result = self.schedule_project_tasks()
                result['newly_scheduled'] = schedule_result['scheduled']
                
        except Attempt.DoesNotExist:
            logger.error(f"Attempt {attempt_id} not found")
        except Exception as e:
            logger.error(f"Error in on_attempt_complete: {str(e)}")
        
        return result
    
    def get_execution_status(self) -> Dict[str, Any]:
        """
        Get current execution status for the project.
        
        Returns comprehensive status including task counts,
        running tasks, blocked tasks, and progress.
        """
        graph = self._build_graph()
        
        all_tasks = Task.objects.filter(project_id=self.project_id)
        
        # Get counts by status
        status_counts = {
            'todo': all_tasks.filter(status='TODO').count(),
            'in_progress': all_tasks.filter(status='IN_PROGRESS').count(),
            'done': all_tasks.filter(status='DONE').count(),
            'failed': all_tasks.filter(status='FAILED').count(),
        }
        
        total = sum(status_counts.values())
        progress = (status_counts['done'] / total * 100) if total > 0 else 0
        
        # Get running tasks details
        running_tasks = all_tasks.filter(status='IN_PROGRESS').values(
            'id', 'title', 'agent_role'
        )
        
        # Get blocked tasks
        blocked = graph.get_blocked_tasks()
        
        # Get ready tasks
        ready = graph.get_ready_tasks()
        
        # Get execution levels for estimated completion
        execution_levels = []
        if not graph.has_cycles():
            try:
                execution_levels = graph.get_execution_levels()
            except ValueError:
                pass
        
        return {
            'project_id': str(self.project_id),
            'status_counts': status_counts,
            'total_tasks': total,
            'progress_percent': round(progress, 1),
            'max_concurrent': MAX_CONCURRENT,
            'currently_running': list(running_tasks),
            'ready_tasks': ready,
            'blocked_tasks': blocked[:10],  # Limit to 10
            'execution_levels': len(execution_levels),
            'has_cycles': graph.has_cycles(),
            'is_complete': status_counts['todo'] == 0 and status_counts['in_progress'] == 0
        }
    
    def cancel_all_running(self) -> Dict[str, Any]:
        """
        Cancel all running tasks in the project.
        
        Returns:
            Dict with cancelled task/attempt info
        """
        from apps.attempts.models import Attempt
        
        result = {
            'cancelled_tasks': [],
            'cancelled_attempts': []
        }
        
        # Get running attempts
        running_attempts = Attempt.objects.filter(
            task__project_id=self.project_id,
            status='RUNNING'
        ).select_related('task')
        
        for attempt in running_attempts:
            attempt.status = 'CANCELLED'
            attempt.save()
            
            attempt.task.status = 'TODO'
            attempt.task.save()
            
            result['cancelled_attempts'].append(str(attempt.id))
            result['cancelled_tasks'].append(str(attempt.task.id))
        
        return result
    
    def retry_failed_tasks(self) -> Dict[str, Any]:
        """
        Retry all failed tasks by resetting their status.
        
        Returns:
            Dict with reset tasks and newly scheduled info
        """
        result = {
            'reset_tasks': [],
            'scheduled': []
        }
        
        failed_tasks = Task.objects.filter(
            project_id=self.project_id,
            status='FAILED'
        )
        
        for task in failed_tasks:
            task.status = 'TODO'
            task.save()
            result['reset_tasks'].append({
                'id': str(task.id),
                'title': task.title
            })
        
        # Schedule any that are now ready
        if result['reset_tasks']:
            schedule_result = self.schedule_project_tasks()
            result['scheduled'] = schedule_result['scheduled']
        
        return result
