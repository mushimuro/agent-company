import uuid
from django.db import models

class Task(models.Model):
    """
    Represents a development task assigned to a specific agent role.
    """
    STATUS_CHOICES = [
        ('TODO', 'To Do'),
        ('IN_PROGRESS', 'In Progress'),
        ('IN_REVIEW', 'In Review'),
        ('DONE', 'Done'),
    ]
    
    ROLE_CHOICES = [
        ('PM', 'Project Manager'),
        ('FRONTEND', 'Frontend Developer'),
        ('BACKEND', 'Backend Developer'),
        ('QA', 'QA Engineer'),
        ('DEVOPS', 'DevOps Engineer'),
    ]
    
    PRIORITY_CHOICES = [
        (1, 'Critical'),
        (2, 'High'),
        (3, 'Medium'),
        (4, 'Low'),
        (5, 'Optional'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.Project', 
        on_delete=models.CASCADE, 
        related_name='tasks'
    )
    
    # Task details
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    acceptance_criteria = models.JSONField(default=list, blank=True)  # List of strings
    
    # Assignment and status
    agent_role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='TODO')
    priority = models.IntegerField(choices=PRIORITY_CHOICES, default=3)
    
    # Dependencies
    dependencies = models.JSONField(default=list, blank=True)  # List of task UUIDs
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tasks'
        ordering = ['priority', '-created_at']
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['project', 'agent_role']),
            models.Index(fields=['status', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} [{self.agent_role}]"
    
    @property
    def is_blocked(self):
        """Check if task is blocked by incomplete dependencies."""
        if not self.dependencies:
            return False
        # Avoid circular import by using string reference if possible or just late import
        # But here we are in same file/module usually? No, self reference.
        # But dependencies refer to other tasks.
        # Check specific IDs.
        # Limitations: JSONField doesn't allow join easily.
        # This property might be expensive for list, handled in serializer/view usually.
        # But for logic:
        dependent_tasks = Task.objects.filter(id__in=self.dependencies)
        return dependent_tasks.exclude(status='DONE').exists()
    
    @property
    def attempt_count(self):
        return self.attempts.count()
    
    @property
    def latest_attempt(self):
        return self.attempts.order_by('-created_at').first()
