import { apiClient } from './client';

export interface Project {
    id: string;
    name: string;
    description: string;
    repo_path: string;
    config: Record<string, any>;
    task_count: number;
    completion_percentage: number;
    created_at: string;
    updated_at: string;
}

export interface ProjectCreate {
    name: string;
    description?: string;
    repo_path: string;
    config?: Record<string, any>;
}

export interface GeneratedTask {
    temp_id?: string;
    title: string;
    description: string;
    agent_role: string;
    priority: number;
    acceptance_criteria?: string[];
    dependencies?: string[];
}

export interface PMDecomposition {
    id: string;
    project: string;
    project_name: string;
    requirements: string;
    generated_tasks: GeneratedTask[];
    tasks_created: string[];
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    model_used: string;
    task_count: number;
    created_at: string;
    updated_at: string;
}

export const projectsApi = {
    list: () => apiClient.get<Project[]>('/projects/'),
    get: (id: string) => apiClient.get<Project>(`/projects/${id}/`),
    create: (data: ProjectCreate) => apiClient.post<Project>('/projects/', data),
    update: (id: string, data: Partial<ProjectCreate>) =>
        apiClient.patch<Project>(`/projects/${id}/`, data),
    delete: (id: string) => apiClient.delete(`/projects/${id}/`),
    stats: (id: string) => apiClient.get(`/projects/${id}/stats/`),

    // PM Decomposition
    initializeWithPM: (id: string, requirements: string, model?: string) =>
        apiClient.post<PMDecomposition>(
            `/projects/${id}/initialize-with-pm/`,
            { requirements, model: model || 'gemini-2.5-flash' }
        ),

    getDecompositions: (id: string) =>
        apiClient.get<PMDecomposition[]>(`/projects/${id}/decompositions/`),

    approveDecomposition: (projectId: string, decompositionId: string) =>
        apiClient.post<{ status: string; tasks_created: number; task_ids: string[] }>(
            `/projects/${projectId}/decompositions/${decompositionId}/approve/`
        ),

    rejectDecomposition: (projectId: string, decompositionId: string) =>
        apiClient.post<{ status: string }>(
            `/projects/${projectId}/decompositions/${decompositionId}/reject/`
        ),

    // Parallel Execution Coordination
    executeAllTasks: (id: string) =>
        apiClient.post<{
            scheduled: Array<{
                task_id: string;
                task_title: string;
                attempt_id: string;
                agent_role: string;
            }>;
            already_running: number;
            waiting: number;
            completed: number;
            errors: string[];
        }>(`/projects/${id}/execute-all-tasks/`),

    executionStatus: (id: string) =>
        apiClient.get<{
            project_id: string;
            status_counts: {
                todo: number;
                in_progress: number;
                done: number;
                failed: number;
            };
            total_tasks: number;
            progress_percent: number;
            max_concurrent: number;
            currently_running: Array<{ id: string; title: string; agent_role: string }>;
            ready_tasks: Array<{ id: string; title: string; agent_role: string; priority: number }>;
            blocked_tasks: Array<{
                id: string;
                title: string;
                status: string;
                blocked_by: Array<{ id: string; title: string; status: string }>;
            }>;
            execution_levels: number;
            has_cycles: boolean;
            is_complete: boolean;
        }>(`/projects/${id}/execution-status/`),

    cancelAll: (id: string) =>
        apiClient.post<{
            cancelled_tasks: string[];
            cancelled_attempts: string[];
        }>(`/projects/${id}/cancel-all/`),

    retryFailed: (id: string) =>
        apiClient.post<{
            reset_tasks: Array<{ id: string; title: string }>;
            scheduled: Array<{
                task_id: string;
                task_title: string;
                attempt_id: string;
                agent_role: string;
            }>;
        }>(`/projects/${id}/retry-failed/`),
};

