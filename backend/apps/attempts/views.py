from rest_framework import viewsets, permissions
from .models import Attempt
from .serializers import AttemptSerializer


class AttemptViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for attempts.
    Attempts are created automatically during task execution.
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
        
        return queryset.select_related('task', 'task__project').order_by('-created_at')
