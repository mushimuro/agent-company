from celery import shared_task
from django.db import transaction
from apps.tasks.models import Task
from apps.tasks.executor import TaskExecutor


@shared_task(bind=True, max_retries=3)
def execute_task(self, task_id: str):
    """
    Execute a single task asynchronously.
    
    Args:
        task_id: UUID of the task to execute
    
    Returns:
        dict: Execution result with attempt_id and status
    """
    try:
        task = Task.objects.get(id=task_id)
        executor = TaskExecutor(task)
        attempt = executor.execute()
        
        return {
            'task_id': str(task_id),
            'attempt_id': str(attempt.id),
            'status': attempt.status
        }
    except Task.DoesNotExist:
        return {
            'task_id': str(task_id),
            'error': 'Task not found'
        }
    except Exception as exc:
        # Retry the task on exception
        raise self.retry(exc=exc, countdown=60)


@shared_task
def execute_project_tasks(project_id: str, agent_role: str = None):
    """
    Execute all TODO tasks for a project, optionally filtered by agent role.
    
    Args:
        project_id: UUID of the project
        agent_role: Optional agent role filter (PM, FRONTEND, BACKEND, QA, DEVOPS)
    
    Returns:
        dict: Summary of task execution
    """
    query = Task.objects.filter(
        project_id=project_id,
        status='TODO'
    )
    
    if agent_role:
        query = query.filter(agent_role=agent_role)
    
    # Order by priority
    tasks = query.order_by('-priority')
    
    results = []
    for task in tasks:
        # Execute each task asynchronously
        result = execute_task.delay(str(task.id))
        results.append({
            'task_id': str(task.id),
            'celery_task_id': result.id
        })
    
    return {
        'project_id': str(project_id),
        'agent_role': agent_role,
        'tasks_scheduled': len(results),
        'tasks': results
    }


@shared_task
def check_task_dependencies(task_id: str):
    """
    Check if a task's dependencies are satisfied and update status accordingly.
    
    Args:
        task_id: UUID of the task to check
    
    Returns:
        dict: Dependency check result
    """
    try:
        task = Task.objects.get(id=task_id)
        
        # Check if all dependencies are DONE
        dependencies = task.dependencies.all()
        all_done = all(dep.status == 'DONE' for dep in dependencies)
        
        if all_done and task.status == 'BLOCKED':
            task.status = 'TODO'
            task.save()
            
            return {
                'task_id': str(task_id),
                'dependencies_met': True,
                'status': 'TODO'
            }
        
        return {
            'task_id': str(task_id),
            'dependencies_met': all_done,
            'status': task.status
        }
    except Task.DoesNotExist:
        return {
            'task_id': str(task_id),
            'error': 'Task not found'
        }
