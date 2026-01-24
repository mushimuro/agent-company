import { apiClient } from './client';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type AgentRole = 'PM' | 'FRONTEND' | 'BACKEND' | 'QA' | 'DEVOPS';

export interface Task {
    id: string;
    project: string;
    title: string;
    description: string;
    acceptance_criteria: string[];
    agent_role: AgentRole;
    status: TaskStatus;
    priority: number;
    dependencies: string[];
    is_blocked: boolean;
    attempt_count: number;
    created_at: string;
    updated_at: string;
}

export interface TaskCreate {
    project: string;
    title: string;
    description?: string;
    acceptance_criteria?: string[];
    agent_role: AgentRole;
    priority?: number;
    dependencies?: string[];
}

export const tasksApi = {
    list: (projectId?: string, role?: AgentRole, status?: TaskStatus) => {
        const params = new URLSearchParams();
        if (projectId) params.append('project', projectId);
        if (role) params.append('role', role);
        if (status) params.append('status', status);
        return apiClient.get<Task[]>(`/tasks/?${params}`);
    },

    get: (id: string) => apiClient.get<Task>(`/tasks/${id}/`),

    create: (data: TaskCreate) => apiClient.post<Task>('/tasks/', data),

    update: (id: string, data: Partial<TaskCreate>) =>
        apiClient.patch<Task>(`/tasks/${id}/`, data),

    delete: (id: string) => apiClient.delete(`/tasks/${id}/`),

    move: (id: string, status: TaskStatus, priority?: number) =>
        apiClient.post<Task>(`/tasks/${id}/move/`, { status, priority }),

    checkDependencies: (id: string) =>
        apiClient.get(`/tasks/${id}/check_dependencies/`),

    dependenciesStatus: (id: string) =>
        apiClient.get<{
            task_id: string;
            task_title: string;
            can_start: boolean;
            blocked_by: Array<{ id: string; title: string; status: string }>;
            reason: string;
            dependents: Array<{ id: string; title: string; status: string }>;
            on_critical_path: boolean;
            critical_path: Array<{ id: string; title: string; agent_role: string }>;
        }>(`/tasks/${id}/dependencies_status/`),

    readyTasks: (projectId: string) =>
        apiClient.get<{
            ready_tasks: Array<{ id: string; title: string; agent_role: string; priority: number }>;
            count: number;
        }>(`/tasks/ready_tasks/?project=${projectId}`),

    projectDependencyGraph: (projectId: string) =>
        apiClient.get<{
            nodes: Array<{
                id: string;
                title: string;
                status: string;
                agent_role: string;
                priority: number;
            }>;
            edges: Array<{ source: string; target: string }>;
            has_cycles: boolean;
            cycles: Array<Array<{ id: string; title: string }>>;
            execution_levels: Array<{
                level: number;
                tasks: Array<{ id: string; title: string }>;
            }>;
            blocked_tasks: Array<{
                id: string;
                title: string;
                status: string;
                blocked_by: Array<{ id: string; title: string; status: string }>;
            }>;
            critical_path: Array<{ id: string; title: string; agent_role: string }>;
        }>(`/tasks/project_dependency_graph/?project=${projectId}`),

    execute: (id: string) =>
        apiClient.post<{ task_id: string; celery_task_id: string; message: string }>(`/tasks/${id}/execute/`),
};

