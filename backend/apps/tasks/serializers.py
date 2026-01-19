from rest_framework import serializers
from .models import Task

class TaskSerializer(serializers.ModelSerializer):
    is_blocked = serializers.BooleanField(read_only=True)
    attempt_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'project', 'title', 'description', 'acceptance_criteria',
            'agent_role', 'status', 'priority', 'dependencies',
            'is_blocked', 'attempt_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_dependencies(self, value):
        """Validate that dependencies are valid task IDs in the same project."""
        if not value:
            return value
        
        # We need project_id to validate.
        # If create, it's in initial_data. If update, it's in instance.
        project_id = None
        if self.instance:
            project_id = self.instance.project_id
        elif 'project' in self.initial_data:
            project_id = self.initial_data['project']
        
        if not project_id:
             # Should be caught by project required field validation usually, 
             # but strictly we can't validate deps without project.
             return value

        valid_tasks = Task.objects.filter(
            id__in=value,
            project_id=project_id
        ).values_list('id', flat=True)
        
        # Convert UUIDs to strings for comparison
        valid_task_ids = set(str(tid) for tid in valid_tasks)
        requested_ids = set(str(v) for v in value)
        
        invalid = requested_ids - valid_task_ids
        if invalid:
            raise serializers.ValidationError(f"Invalid task dependencies: {invalid}")
        
        return value

class TaskMoveSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Task.STATUS_CHOICES)
    priority = serializers.IntegerField(required=False, min_value=1, max_value=5)
