from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.conf import settings
from django.utils import timezone
import httpx
from apps.local_access.lda_client import call_lda
from .models import Attempt, AttemptEvent, AttemptGateResult
from .serializers import (
    AttemptSerializer, AttemptCreateSerializer, AttemptRejectSerializer,
    AttemptEventSerializer, AttemptGateResultSerializer
)
from apps.tasks.models import Task
from apps.local_access.models import WritableRoot


class AttemptViewSet(viewsets.ModelViewSet):
    """
    ViewSet for attempts with start, approve, and reject actions.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AttemptSerializer

    def get_queryset(self):
        queryset = Attempt.objects.filter(task__project__owner=self.request.user)

        # Filter by task
        task_id = self.request.query_params.get('task')
        if task_id:
            queryset = queryset.filter(task_id=task_id)

        # Filter by project
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(task__project_id=project_id)

        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Filter by agent role
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(agent_role=role)

        return queryset.select_related(
            'task', 'task__project'
        ).prefetch_related('events', 'gate_results').order_by('-created_at')

    @action(detail=False, methods=['post'])
    def start(self, request):
        """
        Start a new attempt for a task.
        Creates attempt, triggers LDA agent execution via Celery.
        """
        serializer = AttemptCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        task_id = serializer.validated_data['task_id']

        try:
            task = Task.objects.get(
                id=task_id,
                project__owner=request.user
            )
        except Task.DoesNotExist:
            return Response(
                {'error': 'Task not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if task already has a running attempt
        running = Attempt.objects.filter(
            task=task,
            status__in=['PENDING', 'QUEUED', 'RUNNING']
        ).exists()
        if running:
            return Response(
                {'error': 'Task already has a running attempt'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check dependencies
        if task.dependencies:
            blocked = Task.objects.filter(
                id__in=task.dependencies
            ).exclude(status='DONE').exists()
            if blocked:
                return Response(
                    {'error': 'Task has unmet dependencies'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Create attempt
        attempt = Attempt.objects.create(
            task=task,
            agent_role=task.agent_role,
            status='QUEUED'
        )

        # Trigger Celery task
        try:
            from apps.attempts.tasks import start_attempt_task
            celery_task = start_attempt_task.delay(str(attempt.id))

            return Response({
                'attempt_id': str(attempt.id),
                'celery_task_id': celery_task.id,
                'status': 'queued'
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            attempt.status = 'FAILED'
            attempt.error_message = f'Failed to queue task: {str(e)}'
            attempt.save()
            return Response(
                {'error': f'Failed to start attempt: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approve an attempt and merge changes to main branch.
        """
        attempt = self.get_object()

        if attempt.status != 'SUCCESS':
            return Response(
                {'error': f'Can only approve successful attempts (current: {attempt.status})'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Call LDA to merge
        try:
            response = call_lda(
                "/api/v1/git/merge",
                {
                    "repo_path": attempt.task.project.repo_path,
                    "branch_name": attempt.git_branch,
                    "target_branch": "main"
                },
                timeout=60.0
            )
            response.raise_for_status()
            result = response.json()

            if result.get('success'):
                # Update attempt status
                attempt.status = 'APPROVED'
                attempt.save()

                # Update task status
                attempt.task.status = 'DONE'
                attempt.task.save()

                # Cleanup worktree
                self._cleanup_worktree(attempt)

                return Response({
                    'status': 'approved',
                    'message': result.get('message', 'Changes merged successfully')
                })
            else:
                return Response({
                    'status': 'conflict',
                    'error': result.get('error', 'Merge failed')
                }, status=status.HTTP_409_CONFLICT)

        except httpx.HTTPStatusError as e:
            return Response(
                {'error': f'LDA error: {e.response.text}'},
                status=status.HTTP_502_BAD_GATEWAY
            )
        except httpx.RequestError as e:
            return Response(
                {'error': f'Cannot connect to LDA: {str(e)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject an attempt with optional feedback.
        """
        attempt = self.get_object()

        if attempt.status not in ['SUCCESS', 'FAILED']:
            return Response(
                {'error': f'Can only reject completed attempts (current: {attempt.status})'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AttemptRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        feedback = serializer.validated_data.get('feedback', '')

        # Update attempt
        attempt.status = 'REJECTED'
        attempt.result = feedback if feedback else attempt.result
        attempt.save()

        # Update task status back to TODO
        attempt.task.status = 'TODO'
        attempt.task.save()

        # Cleanup worktree
        self._cleanup_worktree(attempt)

        return Response({
            'status': 'rejected',
            'feedback': feedback
        })

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancel a running attempt.
        """
        attempt = self.get_object()

        if attempt.status not in ['PENDING', 'QUEUED', 'RUNNING']:
            return Response(
                {'error': f'Can only cancel pending/running attempts (current: {attempt.status})'},
                status=status.HTTP_400_BAD_REQUEST
            )

        attempt.status = 'CANCELLED'
        attempt.completed_at = timezone.now()
        attempt.save()

        # Update task status back to TODO
        attempt.task.status = 'TODO'
        attempt.task.save()

        # Cleanup worktree if exists
        self._cleanup_worktree(attempt)

        return Response({'status': 'cancelled'})

    @action(detail=True, methods=['get'])
    def events(self, request, pk=None):
        """Get all events for an attempt."""
        attempt = self.get_object()
        events = AttemptEvent.objects.filter(attempt=attempt).order_by('timestamp')
        return Response(AttemptEventSerializer(events, many=True).data)

    @action(detail=True, methods=['get'], url_path='gate-results')
    def gate_results(self, request, pk=None):
        """Get quality gate results for an attempt."""
        attempt = self.get_object()
        results = AttemptGateResult.objects.filter(attempt=attempt)
        return Response(AttemptGateResultSerializer(results, many=True).data)

    def _cleanup_worktree(self, attempt):
        """Helper to cleanup branch after approval/rejection."""
        if not attempt.git_branch:
            return

        try:
            call_lda(
                "/api/v1/git/cleanup",
                {
                    "repo_path": attempt.task.project.repo_path,
                    "worktree_path": attempt.git_branch  # Pass branch name for cleanup
                },
                timeout=30.0
            )
        except Exception:
            # Cleanup failure is not critical
            pass
