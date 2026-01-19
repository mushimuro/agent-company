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

export const projectsApi = {
    list: () => apiClient.get<Project[]>('/projects/'),
    get: (id: string) => apiClient.get<Project>(`/projects/${id}/`),
    create: (data: ProjectCreate) => apiClient.post<Project>('/projects/', data),
    update: (id: string, data: Partial<ProjectCreate>) =>
        apiClient.patch<Project>(`/projects/${id}/`, data),
    delete: (id: string) => apiClient.delete(`/projects/${id}/`),
    stats: (id: string) => apiClient.get(`/projects/${id}/stats/`),
};
