from rest_framework import serializers
from .models import WritableRoot, AuditLog

class WritableRootSerializer(serializers.ModelSerializer):
    class Meta:
        model = WritableRoot
        fields = ['id', 'name', 'path', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'username', 'task', 'task_title', 'action', 'path', 'details', 'created_at']
        read_only_fields = ['id', 'created_at']
