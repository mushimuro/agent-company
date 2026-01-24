from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Task
from .serializers import TaskSerializer, TaskMoveSerializer


class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TaskSerializer
    
    def get_queryset(self):
        queryset = Task.objects.filter(project__owner=self.request.user)
        
        # Filter by project
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        # Filter by role
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(agent_role=role)
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        return queryset.select_related('project')
    
    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """Move task to different status/priority."""
        task = self.get_object()
        serializer = TaskMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        task.status = serializer.validated_data['status']
        if 'priority' in serializer.validated_data:
            task.priority = serializer.validated_data['priority']
        task.save()
        
        return Response(TaskSerializer(task).data)
    
    @action(detail=True, methods=['get'])
    def check_dependencies(self, request, pk=None):
        """Check if task dependencies are met."""
        task = self.get_object()
        
        if not task.dependencies:
            return Response({'can_start': True, 'blocked_by': []})
        
        blocked_tasks = Task.objects.filter(
            id__in=task.dependencies
        ).exclude(status='DONE').values('id', 'title', 'status')
        
        return Response({
            'can_start': not blocked_tasks.exists(),
            'blocked_by': list(blocked_tasks)
        })
    
    @action(detail=True, methods=['get'])
    def dependencies_status(self, request, pk=None):
        """
        Get comprehensive dependency status for a task using DependencyGraph.
        
        Returns:
        - can_start: Boolean if task can be started
        - blocked_by: List of blocking tasks
        - reason: Explanation
        - dependents: Tasks that depend on this task
        - critical_path: Whether this task is on the critical path
        """
        from .utils import DependencyGraph
        
        task = self.get_object()
        
        # Get all tasks in the same project
        project_tasks = Task.objects.filter(project=task.project).values(
            'id', 'title', 'status', 'agent_role', 'priority', 'dependencies'
        )
        
        # Convert to list for DependencyGraph
        tasks_list = [
            {
                'id': str(t['id']),
                'title': t['title'],
                'status': t['status'],
                'agent_role': t['agent_role'],
                'priority': t['priority'],
                'dependencies': [str(d) for d in (t['dependencies'] or [])]
            }
            for t in project_tasks
        ]
        
        # Build dependency graph
        graph = DependencyGraph()
        graph.build_graph(tasks_list)
        
        # Get task status
        can_start_info = graph.can_start(str(task.id))
        dependents = graph.get_task_dependents(str(task.id))
        critical_path = graph.get_critical_path()
        
        # Check if on critical path
        on_critical_path = any(
            cp.get('id') == str(task.id) for cp in critical_path
        )
        
        return Response({
            'task_id': str(task.id),
            'task_title': task.title,
            'can_start': can_start_info['can_start'],
            'blocked_by': can_start_info['blocked_by'],
            'reason': can_start_info['reason'],
            'dependents': dependents,
            'on_critical_path': on_critical_path,
            'critical_path': critical_path
        })
    
    @action(detail=False, methods=['get'])
    def ready_tasks(self, request):
        """
        Get all tasks that are ready to start (dependencies satisfied).
        
        Query params:
        - project: Filter by project ID
        """
        from .utils import DependencyGraph
        
        project_id = request.query_params.get('project')
        if not project_id:
            return Response(
                {'error': 'project query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all tasks for the project
        project_tasks = Task.objects.filter(
            project_id=project_id,
            project__owner=request.user
        ).values(
            'id', 'title', 'status', 'agent_role', 'priority', 'dependencies'
        )
        
        tasks_list = [
            {
                'id': str(t['id']),
                'title': t['title'],
                'status': t['status'],
                'agent_role': t['agent_role'],
                'priority': t['priority'],
                'dependencies': [str(d) for d in (t['dependencies'] or [])]
            }
            for t in project_tasks
        ]
        
        # Build graph and get ready tasks
        graph = DependencyGraph()
        graph.build_graph(tasks_list)
        ready = graph.get_ready_tasks()
        
        return Response({
            'ready_tasks': ready,
            'count': len(ready)
        })
    
    @action(detail=False, methods=['get'])
    def project_dependency_graph(self, request):
        """
        Get full dependency graph for a project for visualization.
        
        Query params:
        - project: Project ID
        
        Returns:
        - nodes: List of task nodes with status, role, priority
        - edges: List of dependency edges
        - execution_levels: Tasks grouped by parallel execution level
        - blocked_tasks: List of tasks blocked by dependencies
        - has_cycles: Boolean if cycles exist
        """
        from .utils import DependencyGraph
        
        project_id = request.query_params.get('project')
        if not project_id:
            return Response(
                {'error': 'project query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all tasks for the project
        project_tasks = Task.objects.filter(
            project_id=project_id,
            project__owner=request.user
        ).values(
            'id', 'title', 'status', 'agent_role', 'priority', 'dependencies'
        )
        
        tasks_list = [
            {
                'id': str(t['id']),
                'title': t['title'],
                'status': t['status'],
                'agent_role': t['agent_role'],
                'priority': t['priority'],
                'dependencies': [str(d) for d in (t['dependencies'] or [])]
            }
            for t in project_tasks
        ]
        
        # Build graph
        graph = DependencyGraph()
        graph.build_graph(tasks_list)
        
        # Get graph data
        graph_data = graph.to_dict()
        
        # Get execution levels if no cycles
        execution_levels = []
        if not graph.has_cycles():
            try:
                levels = graph.get_execution_levels()
                execution_levels = [
                    {
                        'level': i,
                        'tasks': [
                            {
                                'id': task_id,
                                'title': next(
                                    (t['title'] for t in tasks_list if t['id'] == task_id),
                                    'Unknown'
                                )
                            }
                            for task_id in level
                        ]
                    }
                    for i, level in enumerate(levels)
                ]
            except ValueError:
                pass
        
        # Get blocked tasks
        blocked = graph.get_blocked_tasks()
        
        return Response({
            'nodes': graph_data['nodes'],
            'edges': graph_data['edges'],
            'has_cycles': graph_data['has_cycles'],
            'cycles': graph.check_cycles() if graph.has_cycles() else [],
            'execution_levels': execution_levels,
            'blocked_tasks': blocked,
            'critical_path': graph.get_critical_path() if not graph.has_cycles() else []
        })
    
    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """Trigger task execution via Celery."""
        task = self.get_object()
        
        # Check if task is already running
        if task.status == 'IN_PROGRESS':
            return Response(
                {'error': 'Task is already in progress'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Import here to avoid circular import
        from apps.tasks.tasks import execute_task
        
        # Trigger async execution
        celery_task = execute_task.delay(str(task.id))
        
        return Response({
            'task_id': str(task.id),
            'celery_task_id': celery_task.id,
            'message': 'Task execution started'
        })
