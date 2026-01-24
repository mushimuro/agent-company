"""
Dependency Graph - Utility for task dependency management.

Uses NetworkX for graph operations including cycle detection,
topological sorting, and execution order calculation.
"""
import networkx as nx
from typing import List, Dict, Any, Set, Optional
from uuid import UUID


class DependencyGraph:
    """
    Manages task dependencies using a directed acyclic graph (DAG).
    
    Provides functionality for:
    - Building dependency graphs from tasks
    - Detecting circular dependencies
    - Calculating execution order (topological sort)
    - Checking which tasks are blocked
    - Determining if a task can start
    """
    
    def __init__(self):
        self.graph = nx.DiGraph()
        self._task_map: Dict[str, Dict[str, Any]] = {}
    
    def build_graph(self, tasks: List[Dict[str, Any]]) -> 'DependencyGraph':
        """
        Build a dependency graph from a list of tasks.
        
        Args:
            tasks: List of task dictionaries with 'id' and 'dependencies' fields.
                   Each task should have:
                   - id: UUID or string identifier
                   - dependencies: List of task IDs this task depends on
                   - status: Task status (TODO, IN_PROGRESS, DONE, etc.)
                   - title: Task title (optional)
                   - agent_role: Agent role (optional)
        
        Returns:
            self for method chaining
        """
        self.graph.clear()
        self._task_map.clear()
        
        # Add all task nodes
        for task in tasks:
            task_id = str(task.get('id', ''))
            if task_id:
                self.graph.add_node(task_id)
                self._task_map[task_id] = task
        
        # Add dependency edges (edge from dependency -> dependent task)
        for task in tasks:
            task_id = str(task.get('id', ''))
            dependencies = task.get('dependencies', [])
            
            for dep_id in dependencies:
                dep_id_str = str(dep_id)
                if dep_id_str in self._task_map:
                    # Edge direction: dependency -> dependent
                    # This means task_id depends on dep_id_str
                    self.graph.add_edge(dep_id_str, task_id)
        
        return self
    
    def check_cycles(self) -> List[List[str]]:
        """
        Detect circular dependencies in the graph.
        
        Returns:
            List of cycles, where each cycle is a list of task IDs.
            Empty list if no cycles exist.
        """
        try:
            cycles = list(nx.simple_cycles(self.graph))
            
            # Add task titles to make output more useful
            detailed_cycles = []
            for cycle in cycles:
                detailed_cycle = []
                for task_id in cycle:
                    task = self._task_map.get(task_id, {})
                    detailed_cycle.append({
                        'id': task_id,
                        'title': task.get('title', 'Unknown')
                    })
                detailed_cycles.append(detailed_cycle)
            
            return detailed_cycles
        except nx.NetworkXError:
            return []
    
    def has_cycles(self) -> bool:
        """
        Check if the graph has any cycles.
        
        Returns:
            True if cycles exist, False otherwise.
        """
        try:
            nx.find_cycle(self.graph)
            return True
        except nx.NetworkXNoCycle:
            return False
    
    def get_execution_order(self) -> List[str]:
        """
        Get the topological execution order of tasks.
        
        Tasks with no dependencies come first, followed by tasks
        whose dependencies have been satisfied.
        
        Returns:
            List of task IDs in execution order.
        
        Raises:
            ValueError: If the graph contains cycles.
        """
        if self.has_cycles():
            cycles = self.check_cycles()
            raise ValueError(f"Cannot determine execution order: circular dependencies detected. Cycles: {cycles}")
        
        try:
            return list(nx.topological_sort(self.graph))
        except nx.NetworkXUnfeasible:
            raise ValueError("Cannot determine execution order: graph contains cycles")
    
    def get_execution_levels(self) -> List[List[str]]:
        """
        Get tasks grouped by execution level.
        
        Tasks in the same level can be executed in parallel.
        Level 0 contains tasks with no dependencies.
        Level n contains tasks that depend only on tasks from levels 0..n-1.
        
        Returns:
            List of levels, where each level is a list of task IDs.
        
        Raises:
            ValueError: If the graph contains cycles.
        """
        if self.has_cycles():
            raise ValueError("Cannot determine execution levels: graph contains cycles")
        
        levels = []
        remaining = set(self.graph.nodes())
        completed = set()
        
        while remaining:
            # Find all tasks whose dependencies are all in completed set
            current_level = []
            for task_id in remaining:
                deps = set(self.graph.predecessors(task_id))
                if deps.issubset(completed):
                    current_level.append(task_id)
            
            if not current_level:
                # No progress made - this shouldn't happen in a DAG
                break
            
            levels.append(current_level)
            completed.update(current_level)
            remaining -= set(current_level)
        
        return levels
    
    def get_blocked_tasks(self, completed_task_ids: Optional[Set[str]] = None) -> List[Dict[str, Any]]:
        """
        Get all tasks that are blocked by incomplete dependencies.
        
        Args:
            completed_task_ids: Set of task IDs that are already complete.
                               If None, uses status field from task data.
        
        Returns:
            List of blocked tasks with their blocking dependencies.
        """
        if completed_task_ids is None:
            # Determine completed tasks from status
            completed_task_ids = {
                task_id for task_id, task in self._task_map.items()
                if task.get('status') == 'DONE'
            }
        
        blocked = []
        for task_id, task in self._task_map.items():
            if task_id in completed_task_ids:
                continue
            
            deps = set(self.graph.predecessors(task_id))
            incomplete_deps = deps - completed_task_ids
            
            if incomplete_deps:
                blocked.append({
                    'id': task_id,
                    'title': task.get('title', 'Unknown'),
                    'status': task.get('status', 'UNKNOWN'),
                    'blocked_by': [
                        {
                            'id': dep_id,
                            'title': self._task_map.get(dep_id, {}).get('title', 'Unknown'),
                            'status': self._task_map.get(dep_id, {}).get('status', 'UNKNOWN')
                        }
                        for dep_id in incomplete_deps
                    ]
                })
        
        return blocked
    
    def can_start(self, task_id: str, completed_task_ids: Optional[Set[str]] = None) -> Dict[str, Any]:
        """
        Check if a specific task can start execution.
        
        Args:
            task_id: ID of the task to check.
            completed_task_ids: Set of completed task IDs.
                               If None, uses status field from task data.
        
        Returns:
            Dict with:
            - can_start: Boolean indicating if task can start
            - blocked_by: List of blocking task info (if blocked)
            - reason: Explanation of why task can or cannot start
        """
        task_id = str(task_id)
        
        if task_id not in self._task_map:
            return {
                'can_start': False,
                'blocked_by': [],
                'reason': f'Task {task_id} not found'
            }
        
        task = self._task_map[task_id]
        
        # Check if task is already done
        if task.get('status') == 'DONE':
            return {
                'can_start': False,
                'blocked_by': [],
                'reason': 'Task is already completed'
            }
        
        # Check if task is already in progress
        if task.get('status') == 'IN_PROGRESS':
            return {
                'can_start': False,
                'blocked_by': [],
                'reason': 'Task is already in progress'
            }
        
        # Determine completed tasks
        if completed_task_ids is None:
            completed_task_ids = {
                tid for tid, t in self._task_map.items()
                if t.get('status') == 'DONE'
            }
        
        # Check dependencies
        deps = set(self.graph.predecessors(task_id))
        incomplete_deps = deps - completed_task_ids
        
        if incomplete_deps:
            return {
                'can_start': False,
                'blocked_by': [
                    {
                        'id': dep_id,
                        'title': self._task_map.get(dep_id, {}).get('title', 'Unknown'),
                        'status': self._task_map.get(dep_id, {}).get('status', 'UNKNOWN')
                    }
                    for dep_id in incomplete_deps
                ],
                'reason': f'Waiting for {len(incomplete_deps)} dependencies to complete'
            }
        
        return {
            'can_start': True,
            'blocked_by': [],
            'reason': 'All dependencies satisfied'
        }
    
    def get_ready_tasks(self, completed_task_ids: Optional[Set[str]] = None) -> List[Dict[str, Any]]:
        """
        Get all tasks that are ready to start (dependencies satisfied).
        
        Args:
            completed_task_ids: Set of completed task IDs.
        
        Returns:
            List of task info for ready tasks.
        """
        # Determine completed and in-progress tasks
        if completed_task_ids is None:
            completed_task_ids = {
                tid for tid, t in self._task_map.items()
                if t.get('status') == 'DONE'
            }
        
        in_progress_ids = {
            tid for tid, t in self._task_map.items()
            if t.get('status') == 'IN_PROGRESS'
        }
        
        ready = []
        for task_id, task in self._task_map.items():
            # Skip completed or in-progress tasks
            if task_id in completed_task_ids or task_id in in_progress_ids:
                continue
            
            # Check if all dependencies are complete
            deps = set(self.graph.predecessors(task_id))
            if deps.issubset(completed_task_ids):
                ready.append({
                    'id': task_id,
                    'title': task.get('title', 'Unknown'),
                    'agent_role': task.get('agent_role', 'UNKNOWN'),
                    'priority': task.get('priority', 3)
                })
        
        # Sort by priority (lower number = higher priority)
        ready.sort(key=lambda x: x.get('priority', 999))
        
        return ready
    
    def get_task_dependents(self, task_id: str) -> List[Dict[str, Any]]:
        """
        Get all tasks that depend on a specific task.
        
        Args:
            task_id: ID of the task.
        
        Returns:
            List of dependent task info.
        """
        task_id = str(task_id)
        
        if task_id not in self.graph:
            return []
        
        dependents = list(self.graph.successors(task_id))
        
        return [
            {
                'id': dep_id,
                'title': self._task_map.get(dep_id, {}).get('title', 'Unknown'),
                'status': self._task_map.get(dep_id, {}).get('status', 'UNKNOWN')
            }
            for dep_id in dependents
        ]
    
    def get_critical_path(self) -> List[Dict[str, Any]]:
        """
        Get the critical path through the dependency graph.
        
        The critical path is the longest path through the graph,
        representing the minimum time to complete all tasks.
        
        Returns:
            List of tasks on the critical path.
        """
        if self.has_cycles():
            return []
        
        try:
            # Find the longest path
            longest = nx.dag_longest_path(self.graph)
            
            return [
                {
                    'id': task_id,
                    'title': self._task_map.get(task_id, {}).get('title', 'Unknown'),
                    'agent_role': self._task_map.get(task_id, {}).get('agent_role', 'UNKNOWN')
                }
                for task_id in longest
            ]
        except nx.NetworkXError:
            return []
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Export the graph structure for visualization.
        
        Returns:
            Dict with nodes and edges for frontend visualization.
        """
        nodes = []
        for task_id, task in self._task_map.items():
            nodes.append({
                'id': task_id,
                'title': task.get('title', 'Unknown'),
                'status': task.get('status', 'UNKNOWN'),
                'agent_role': task.get('agent_role', 'UNKNOWN'),
                'priority': task.get('priority', 3)
            })
        
        edges = []
        for source, target in self.graph.edges():
            edges.append({
                'source': source,
                'target': target
            })
        
        return {
            'nodes': nodes,
            'edges': edges,
            'has_cycles': self.has_cycles()
        }
