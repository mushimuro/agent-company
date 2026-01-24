from rest_framework import serializers
from .models import Attempt, AttemptEvent, AttemptGateResult


class AttemptEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttemptEvent
        fields = ['id', 'event_type', 'message', 'metadata', 'timestamp']


class AttemptGateResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttemptGateResult
        fields = ['id', 'gate_type', 'status', 'output', 'duration_seconds', 'created_at']


class AttemptSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source='task.title', read_only=True)
    project_id = serializers.UUIDField(source='task.project_id', read_only=True)
    project_name = serializers.CharField(source='task.project.name', read_only=True)
    duration = serializers.FloatField(read_only=True)
    events = AttemptEventSerializer(many=True, read_only=True)
    gate_results = AttemptGateResultSerializer(many=True, read_only=True)

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
            'git_branch',
            'worktree_path',
            'result',
            'diff',
            'error_message',
            'files_changed',
            'duration',
            'events',
            'gate_results',
            'started_at',
            'completed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AttemptCreateSerializer(serializers.Serializer):
    """Serializer for starting a new attempt."""
    task_id = serializers.UUIDField()


class AttemptRejectSerializer(serializers.Serializer):
    """Serializer for rejecting an attempt."""
    feedback = serializers.CharField(required=False, allow_blank=True, default="")
