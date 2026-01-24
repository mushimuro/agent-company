from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Task
from .serializers import TaskSerializer, TaskMoveSerializer

class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TaskSerializer
    
    def get_queryset(self):
        queryset = Task.objects.filter(project__owner=self.request.user)
        
        # Filter by project
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        # Filter by role
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(agent_role=role)
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        return queryset.select_related('project')
    
    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """Move task to different status/priority."""
        task = self.get_object()
        serializer = TaskMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        task.status = serializer.validated_data['status']
        if 'priority' in serializer.validated_data:
            task.priority = serializer.validated_data['priority']
        task.save()
        
        return Response(TaskSerializer(task).data)
    
    @action(detail=True, methods=['get'])
    def check_dependencies(self, request, pk=None):
        """Check if task dependencies are met."""
        task = self.get_object()
        
        if not task.dependencies:
            return Response({'can_start': True, 'blocked_by': []})
        
        blocked_tasks = Task.objects.filter(
            id__in=task.dependencies
        ).exclude(status='DONE').values('id', 'title', 'status')
        
        return Response({
            'can_start': not blocked_tasks.exists(),
            'blocked_by': list(blocked_tasks)
        })
    
    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """Trigger task execution via Celery."""
        task = self.get_object()
        
        # Check if task is already running
        if task.status == 'IN_PROGRESS':
            return Response(
                {'error': 'Task is already in progress'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Import here to avoid circular import
        from apps.tasks.tasks import execute_task
        
        # Trigger async execution
        celery_task = execute_task.delay(str(task.id))
        
        return Response({
            'task_id': str(task.id),
            'celery_task_id': celery_task.id,
            'message': 'Task execution started'
        })

