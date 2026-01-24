import { apiClient } from './client';

export interface WritableRoot {
    id: string;
    name: string;
    path: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface WritableRootCreate {
    name: string;
    path: string;
    is_active?: boolean;
}

export interface AuditLog {
    id: string;
    user: string;
    username: string;
    task: string;
    task_title: string;
    action: string;
    path: string;
    details: Record<string, any>;
    created_at: string;
}

export const localAccessApi = {
    listWritableRoots: () => apiClient.get<WritableRoot[]>('/writable-roots/'),
    getWritableRoot: (id: string) => apiClient.get<WritableRoot>(`/writable-roots/${id}/`),
    createWritableRoot: (data: WritableRootCreate) => apiClient.post<WritableRoot>('/writable-roots/', data),
    updateWritableRoot: (id: string, data: Partial<WritableRootCreate>) =>
        apiClient.patch<WritableRoot>(`/writable-roots/${id}/`, data),
    deleteWritableRoot: (id: string) => apiClient.delete(`/writable-roots/${id}/`),
    listAuditLogs: (params?: any) => apiClient.get<AuditLog[]>('/audit-logs/', { params }),
};
