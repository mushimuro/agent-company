import uuid
from django.db import models
from django.utils import timezone


class Attempt(models.Model):
    """
    Represents a single execution attempt of a task by an agent.
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('QUEUED', 'Queued'),
        ('RUNNING', 'Running'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.CASCADE,
        related_name='attempts'
    )

    # Execution details
    agent_role = models.CharField(max_length=50)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )

    # Git information
    git_branch = models.CharField(max_length=255, blank=True)
    worktree_path = models.CharField(max_length=1024, blank=True)

    # Result data
    result = models.TextField(blank=True, null=True)
    diff = models.TextField(blank=True, help_text="Git diff output")
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
        indexes = [
            models.Index(fields=['task', '-created_at']),
            models.Index(fields=['status', '-created_at']),
        ]

    def __str__(self):
        return f"Attempt {self.id} for {self.task.title} - {self.status}"

    @property
    def duration(self):
        """Calculate execution duration in seconds."""
        if not self.started_at:
            return None
        end_time = self.completed_at or timezone.now()
        return (end_time - self.started_at).total_seconds()


class AttemptEvent(models.Model):
    """
    Individual log events during attempt execution.
    Streamed to frontend via WebSocket.
    """
    EVENT_TYPES = [
        ('LOG', 'Log Output'),
        ('STATUS', 'Status Change'),
        ('PROGRESS', 'Progress Update'),
        ('ERROR', 'Error Message'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(
        Attempt,
        on_delete=models.CASCADE,
        related_name='events'
    )

    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    message = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'attempt_events'
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['attempt', 'timestamp']),
        ]

    def __str__(self):
        return f"[{self.event_type}] {self.message[:50]}"


class AttemptGateResult(models.Model):
    """
    Results from quality gates (tests, linting).
    """
    GATE_TYPES = [
        ('TEST', 'Test Execution'),
        ('LINT', 'Code Linting'),
        ('BUILD', 'Build Verification'),
    ]

    STATUS_CHOICES = [
        ('PASSED', 'Passed'),
        ('FAILED', 'Failed'),
        ('SKIPPED', 'Skipped'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(
        Attempt,
        on_delete=models.CASCADE,
        related_name='gate_results'
    )

    gate_type = models.CharField(max_length=50, choices=GATE_TYPES)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES)
    output = models.TextField(blank=True)
    duration_seconds = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'attempt_gate_results'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['attempt', 'gate_type']),
        ]

    def __str__(self):
        return f"{self.gate_type} - {self.status}"
