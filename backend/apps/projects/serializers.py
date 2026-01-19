from rest_framework import serializers
from .models import Project

class ProjectSerializer(serializers.ModelSerializer):
    task_count = serializers.IntegerField(read_only=True)
    completion_percentage = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'repo_path', 'config',
            'task_count', 'completion_percentage',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class ProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['name', 'description', 'repo_path', 'config']
    
    def validate_repo_path(self, value):
        import os
        # Basic validation, LDA will verify later
        if not os.path.isabs(value):
            # On Windows, drive letter check or starts with /
            # os.path.isabs covers both.
            raise serializers.ValidationError("Repo path must be absolute")
        return value
