from rest_framework import serializers
from .models import WritableRoot, AuditLog, PMDecomposition
import os


class WritableRootSerializer(serializers.ModelSerializer):
    class Meta:
        model = WritableRoot
        fields = ['id', 'name', 'path', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_path(self, value):
        """Validate that path is absolute and not a system folder."""
        if not os.path.isabs(value):
            raise serializers.ValidationError("Path must be absolute")

        # Resolve to canonical path
        canonical = os.path.realpath(value)

        # Check if it's a system folder
        system_folders = [
            "C:\\Windows", "C:\\Program Files", "C:\\Program Files (x86)",
            "/System", "/usr", "/etc", "/bin", "/sbin"
        ]
        for blocked in system_folders:
            if canonical.lower().startswith(blocked.lower()):
                raise serializers.ValidationError(f"Cannot add system folder: {blocked}")

        return canonical


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'username', 'task', 'task_title',
            'action', 'path', 'result', 'details', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PMDecompositionSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)
    task_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = PMDecomposition
        fields = [
            'id', 'project', 'project_name', 'requirements',
            'generated_tasks', 'tasks_created', 'status',
            'model_used', 'task_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PMDecompositionCreateSerializer(serializers.Serializer):
    """Serializer for creating a new PM decomposition."""
    requirements = serializers.CharField(min_length=10)
    model = serializers.CharField(default='gemini-2.5-flash')
