from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models
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
