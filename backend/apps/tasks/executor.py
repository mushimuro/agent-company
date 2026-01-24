import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from apps.tasks.models import Task
from apps.attempts.models import Attempt


class TaskExecutor:
    """
    Manages the execution lifecycle of a task.
    Handles creating attempts, tracking status, and broadcasting updates.
    """
    
    def __init__(self, task: Task):
        self.task = task
        self.channel_layer = get_channel_layer()
    
    def create_attempt(self) -> Attempt:
        """Create a new attempt for this task"""
        attempt = Attempt.objects.create(
            task=self.task,
            agent_role=self.task.agent_role,
            status='PENDING'
        )
        
        # Broadcast task update
        self._broadcast_task_update('attempt_created')
        
        return attempt
    
    def start_attempt(self, attempt: Attempt) -> None:
        """Mark attempt as running"""
        attempt.status = 'RUNNING'
        attempt.started_at = timezone.now()
        attempt.save()
        
        self.task.status = 'IN_PROGRESS'
        self.task.save()
        
        self._broadcast_task_update('started')
    
    def complete_attempt(
        self, 
        attempt: Attempt, 
        success: bool,
        result: Optional[str] = None,
        error_message: Optional[str] = None,
        files_changed: Optional[list] = None
    ) -> None:
        """Complete an attempt with results"""
        attempt.status = 'SUCCESS' if success else 'FAILED'
        attempt.completed_at = timezone.now()
        attempt.result = result
        attempt.error_message = error_message
        
        if files_changed:
            attempt.files_changed = files_changed
        
        attempt.save()
        
        # Update task status based on attempt result
        if success:
            self.task.status = 'IN_REVIEW'
        else:
            # Keep as IN_PROGRESS if there was an error (can retry)
            self.task.status = 'TODO' if self.task.status == 'TODO' else 'IN_PROGRESS'
        
        self.task.save()
        
        self._broadcast_task_update('completed' if success else 'failed')
    
    def _broadcast_task_update(self, action: str) -> None:
        """Broadcast task update to WebSocket clients"""
        if not self.channel_layer:
            return
        
        group_name = f'project_{self.task.project_id}'
        
        try:
            async_to_sync(self.channel_layer.group_send)(
                group_name,
                {
                    'type': 'task_update',
                    'task': {
                        'id': str(self.task.id),
                        'title': self.task.title,
                        'status': self.task.status,
                        'agent_role': self.task.agent_role,
                        'attempt_count': self.task.attempt_count,
                    },
                    'action': action
                }
            )
        except Exception as e:
            # Log but don't fail the task execution if broadcast fails
            print(f"Failed to broadcast task update: {e}")
    
    def execute(self) -> Attempt:
        """
        Execute the task by creating an attempt and delegating to the appropriate agent.
        """
        from apps.agents.factory import AgentFactory
        
        attempt = self.create_attempt()
        self.start_attempt(attempt)
        
        try:
            # Create appropriate agent for this task
            agent = AgentFactory.create_agent(self.task, attempt)
            
            # Execute the task via the agent
            result = agent.execute()
            
            # Complete the attempt with the result
            self.complete_attempt(
                attempt,
                success=result.get('success', False),
                result=result.get('result', ''),
                error_message=result.get('error_message'),
                files_changed=result.get('files_changed', [])
            )
            
        except Exception as e:
            # Handle any execution errors
            self.complete_attempt(
                attempt,
                success=False,
                error_message=f"Execution error: {str(e)}"
            )
        
        return attempt
