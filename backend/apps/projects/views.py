from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Project
from apps.tasks.models import Task
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
        tasks = project.tasks.all()
        
        stats = {
            'total_tasks': tasks.count(),
            'by_status': {},
            'by_role': {},
            'completion_percentage': project.completion_percentage,
        }
        
        for status_choice, _ in Task.STATUS_CHOICES:
            stats['by_status'][status_choice] = tasks.filter(status=status_choice).count()
        
        for role_choice, _ in Task.ROLE_CHOICES:
            stats['by_role'][role_choice] = tasks.filter(agent_role=role_choice).count()
        
        return Response(stats)
