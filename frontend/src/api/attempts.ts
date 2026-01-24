import { apiClient } from './client';

export interface AttemptEvent {
    id: string;
    event_type: 'LOG' | 'STATUS' | 'PROGRESS' | 'ERROR';
    message: string;
    metadata: Record<string, any>;
    timestamp: string;
}

export interface AttemptGateResult {
    id: string;
    gate_type: 'TEST' | 'LINT' | 'BUILD';
    status: 'PASSED' | 'FAILED' | 'SKIPPED';
    output: string;
    duration_seconds: number | null;
    created_at: string;
}

export interface Attempt {
    id: string;
    task: string;
    task_title: string;
    project_id: string;
    project_name: string;
    agent_role: string;
    status: 'PENDING' | 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'APPROVED' | 'REJECTED';
    git_branch: string;
    worktree_path: string;
    result: string | null;
    diff: string;
    error_message: string | null;
    files_changed: string[];
    duration: number | null;
    events: AttemptEvent[];
    gate_results: AttemptGateResult[];
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface AttemptListParams {
    task?: string;
    project?: string;
    status?: string;
    role?: string;
}

export const attemptsApi = {
    list: (params?: AttemptListParams) =>
        apiClient.get<Attempt[]>('/attempts/', { params }),

    get: (id: string) =>
        apiClient.get<Attempt>(`/attempts/${id}/`),

    start: (taskId: string) =>
        apiClient.post<{ attempt_id: string; celery_task_id: string; status: string }>(
            '/attempts/start/',
            { task_id: taskId }
        ),

    approve: (id: string) =>
        apiClient.post<{ status: string; message?: string; error?: string }>(
            `/attempts/${id}/approve/`
        ),

    reject: (id: string, feedback?: string) =>
        apiClient.post<{ status: string; feedback: string }>(
            `/attempts/${id}/reject/`,
            { feedback: feedback || '' }
        ),

    cancel: (id: string) =>
        apiClient.post<{ status: string }>(`/attempts/${id}/cancel/`),

    events: (id: string) =>
        apiClient.get<AttemptEvent[]>(`/attempts/${id}/events/`),

    gateResults: (id: string) =>
        apiClient.get<AttemptGateResult[]>(`/attempts/${id}/gate-results/`),
};
