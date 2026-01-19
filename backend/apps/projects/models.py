import uuid
from django.db import models
from django.conf import settings

class Project(models.Model):
    """
    Represents a software project with associated git repository.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='projects'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    repo_path = models.CharField(max_length=1024)  # Absolute path to local repo
    
    # Project configuration
    config = models.JSONField(default=dict, blank=True)  # {install_cmd, test_cmd, lint_cmd, build_cmd}
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'projects'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.owner.username})"
    
    @property
    def task_count(self):
        return self.tasks.count()
    
    @property
    def completion_percentage(self):
        total = self.tasks.count()
        if total == 0:
            return 0
        done = self.tasks.filter(status='DONE').count()
        return int((done / total) * 100)
