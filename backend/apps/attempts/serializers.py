from rest_framework import serializers
from .models import Attempt


class AttemptSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source='task.title', read_only=True)
    project_id = serializers.UUIDField(source='task.project_id', read_only=True)
    project_name = serializers.CharField(source='task.project.name', read_only=True)
    
    class Meta:
        model = Attempt
        fields = [
            'id',
            'task',
            'task_title',
            'project_id',
            'project_name',
            'agent_role',
            'status',
            'result',
            'error_message',
            'files_changed',
            'started_at',
            'completed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
