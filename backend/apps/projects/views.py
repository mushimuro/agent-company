from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models
from django.conf import settings
import httpx
from .models import Project
from apps.tasks.models import Task
from apps.local_access.models import PMDecomposition, WritableRoot
from apps.local_access.serializers import PMDecompositionSerializer, PMDecompositionCreateSerializer
from .serializers import ProjectSerializer, ProjectCreateSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return Project.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return ProjectCreateSerializer
        return ProjectSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get detailed project statistics."""
        project = self.get_object()
        tasks = Task.objects.filter(project=project)
        
        stats = {
            'total_tasks': tasks.count(),
            'todo': tasks.filter(status='TODO').count(),
            'in_progress': tasks.filter(status='IN_PROGRESS').count(),
            'in_review': tasks.filter(status='IN_REVIEW').count(),
            'done': tasks.filter(status='DONE').count(),
            'by_role': {
                'PM': tasks.filter(agent_role='PM').count(),
                'FRONTEND': tasks.filter(agent_role='FRONTEND').count(),
                'BACKEND': tasks.filter(agent_role='BACKEND').count(),
                'QA': tasks.filter(agent_role='QA').count(),
                'DEVOPS': tasks.filter(agent_role='DEVOPS').count(),
            },
            'avg_priority': tasks.aggregate(avg=models.Avg('priority'))['avg'] or 0,
            'total_attempts': sum(task.attempt_count for task in tasks),
            'completion_percentage': project.completion_percentage,
        }
        
        return Response(stats)

    @action(detail=True, methods=['post'], url_path='initialize-with-pm')
    def initialize_with_pm(self, request, pk=None):
        """
        Trigger PM agent to decompose requirements into tasks.
        Creates a PMDecomposition record for user review.
        """
        project = self.get_object()
        serializer = PMDecompositionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        requirements = serializer.validated_data['requirements']
        model = serializer.validated_data.get('model', 'gemini-2.5-flash')

        # Call LDA PM decompose endpoint
        try:
            lda_url = getattr(settings, 'LDA_URL', 'http://localhost:8001')
            lda_secret = getattr(settings, 'LDA_SECRET_KEY', '')

            # Build signature header
            import hashlib
            import time
            timestamp = str(int(time.time()))
            signature = hashlib.sha256(f"{timestamp}{lda_secret}".encode()).hexdigest()

            response = httpx.post(
                f"{lda_url}/api/pm/decompose",
                json={
                    "project_name": project.name,
                    "project_description": project.description or "",
                    "requirements": requirements,
                    "repo_path": project.repo_path,
                    "model": model
                },
                headers={
                    "X-Timestamp": timestamp,
                    "X-Signature": signature
                },
                timeout=120.0
            )
            response.raise_for_status()
            result = response.json()

            # Create PMDecomposition record
            decomposition = PMDecomposition.objects.create(
                project=project,
                requirements=requirements,
                generated_tasks=result.get('tasks', []),
                model_used=model,
                status='PENDING'
            )

            return Response(
                PMDecompositionSerializer(decomposition).data,
                status=status.HTTP_201_CREATED
            )

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

    @action(detail=True, methods=['get'], url_path='decompositions')
    def decompositions(self, request, pk=None):
        """List all PM decompositions for this project."""
        project = self.get_object()
        decompositions = PMDecomposition.objects.filter(project=project)
        return Response(PMDecompositionSerializer(decompositions, many=True).data)

    @action(detail=True, methods=['post'], url_path='decompositions/(?P<decomposition_id>[^/.]+)/approve')
    def approve_decomposition(self, request, pk=None, decomposition_id=None):
        """
        Approve PM decomposition and create tasks from generated_tasks.
        """
        project = self.get_object()

        try:
            decomposition = PMDecomposition.objects.get(
                id=decomposition_id,
                project=project
            )
        except PMDecomposition.DoesNotExist:
            return Response(
                {'error': 'Decomposition not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if decomposition.status != 'PENDING':
            return Response(
                {'error': f'Decomposition already {decomposition.status.lower()}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create tasks from generated_tasks
        created_task_ids = []
        task_id_mapping = {}  # Map temp IDs to real IDs for dependencies

        for idx, task_data in enumerate(decomposition.generated_tasks):
            task = Task.objects.create(
                project=project,
                title=task_data.get('title', f'Task {idx + 1}'),
                description=task_data.get('description', ''),
                agent_role=task_data.get('agent_role', 'BACKEND'),
                priority=task_data.get('priority', idx + 1),
                acceptance_criteria=task_data.get('acceptance_criteria', []),
                status='TODO'
            )
            created_task_ids.append(str(task.id))
            # Map temp ID (index or temp_id) to real ID
            temp_id = task_data.get('temp_id', str(idx))
            task_id_mapping[temp_id] = str(task.id)

        # Second pass: resolve dependencies
        for idx, task_data in enumerate(decomposition.generated_tasks):
            if 'dependencies' in task_data and task_data['dependencies']:
                temp_id = task_data.get('temp_id', str(idx))
                real_id = task_id_mapping.get(temp_id)
                if real_id:
                    task = Task.objects.get(id=real_id)
                    resolved_deps = []
                    for dep_temp_id in task_data['dependencies']:
                        if dep_temp_id in task_id_mapping:
                            resolved_deps.append(task_id_mapping[dep_temp_id])
                    task.dependencies = resolved_deps
                    task.save()

        # Update decomposition status
        decomposition.status = 'APPROVED'
        decomposition.tasks_created = created_task_ids
        decomposition.save()

        return Response({
            'status': 'approved',
            'tasks_created': len(created_task_ids),
            'task_ids': created_task_ids
        })

    @action(detail=True, methods=['post'], url_path='decompositions/(?P<decomposition_id>[^/.]+)/reject')
    def reject_decomposition(self, request, pk=None, decomposition_id=None):
        """Reject PM decomposition."""
        project = self.get_object()

        try:
            decomposition = PMDecomposition.objects.get(
                id=decomposition_id,
                project=project
            )
        except PMDecomposition.DoesNotExist:
            return Response(
                {'error': 'Decomposition not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if decomposition.status != 'PENDING':
            return Response(
                {'error': f'Decomposition already {decomposition.status.lower()}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        decomposition.status = 'REJECTED'
        decomposition.save()

        return Response({'status': 'rejected'})

    @action(detail=True, methods=['post'], url_path='execute-all-tasks')
    def execute_all_tasks(self, request, pk=None):
        """
        Start parallel execution of ready tasks up to concurrency limit.
        
        Uses ExecutionCoordinator to:
        - Respect task dependencies
        - Limit concurrent executions (default: 4)
        - Schedule ready tasks automatically
        
        Returns:
        - scheduled: List of scheduled task/attempt info
        - already_running: Count of running tasks
        - waiting: Count of tasks waiting for dependencies
        - completed: Count of completed tasks
        """
        from apps.attempts.services import ExecutionCoordinator
        
        project = self.get_object()
        coordinator = ExecutionCoordinator(str(project.id), request.user)
        
        result = coordinator.schedule_project_tasks()
        
        return Response(result)

    @action(detail=True, methods=['get'], url_path='execution-status')
    def execution_status(self, request, pk=None):
        """
        Get comprehensive execution status for the project.
        
        Returns:
        - status_counts: Tasks by status
        - progress_percent: Overall completion percentage
        - currently_running: Currently executing tasks
        - ready_tasks: Tasks ready to execute
        - blocked_tasks: Tasks waiting for dependencies
        - execution_levels: Parallel execution levels
        """
        from apps.attempts.services import ExecutionCoordinator
        
        project = self.get_object()
        coordinator = ExecutionCoordinator(str(project.id), request.user)
        
        execution_status = coordinator.get_execution_status()
        
        return Response(execution_status)

    @action(detail=True, methods=['post'], url_path='cancel-all')
    def cancel_all(self, request, pk=None):
        """
        Cancel all running task executions in the project.
        
        Returns:
        - cancelled_tasks: List of cancelled task IDs
        - cancelled_attempts: List of cancelled attempt IDs
        """
        from apps.attempts.services import ExecutionCoordinator
        
        project = self.get_object()
        coordinator = ExecutionCoordinator(str(project.id), request.user)
        
        result = coordinator.cancel_all_running()
        
        return Response(result)

    @action(detail=True, methods=['post'], url_path='retry-failed')
    def retry_failed(self, request, pk=None):
        """
        Reset all failed tasks to TODO and reschedule.
        
        Returns:
        - reset_tasks: Tasks that were reset
        - scheduled: Newly scheduled tasks
        """
        from apps.attempts.services import ExecutionCoordinator
        
        project = self.get_object()
        coordinator = ExecutionCoordinator(str(project.id), request.user)
        
        result = coordinator.retry_failed_tasks()
        
        return Response(result)

