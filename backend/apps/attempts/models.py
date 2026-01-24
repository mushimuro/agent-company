import uuid
from django.db import models

class Attempt(models.Model):
    """
    Represents a single execution attempt of a task by an agent.
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('RUNNING', 'Running'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(
        'tasks.Task', 
        on_delete=models.CASCADE, 
        related_name='attempts'
    )
    
    # Execution details
    agent_role = models.CharField(max_length=50) # Role that performed this attempt
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='PENDING'
    )
    
    # Result data
    result = models.TextField(blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    files_changed = models.JSONField(default=list, blank=True)
    logs = models.JSONField(default=list, blank=True)
    
    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'attempts'
        ordering = ['-created_at']

    def __str__(self):
        return f"Attempt {self.id} for {self.task.title} - {self.status}"
