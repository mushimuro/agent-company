import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, TaskCreate, TaskStatus, AgentRole } from '@/api/tasks';
import { toast } from 'sonner';

export function useTasks(projectId?: string, role?: AgentRole) {
    return useQuery({
        queryKey: ['tasks', projectId, role],
        queryFn: async () => {
            const response = await tasksApi.list(projectId, role);
            return response.data;
        },
        enabled: !!projectId,
    });
}

export function useTask(id: string | undefined) {
    return useQuery({
        queryKey: ['tasks', id],
        queryFn: async () => {
            if (!id) throw new Error('Task ID required');
            const response = await tasksApi.get(id);
            return response.data;
        },
        enabled: !!id,
    });
}

export function useCreateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: TaskCreate) => tasksApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Task created successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to create task');
        },
    });
}

export function useMoveTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status, priority }: {
            id: string;
            status: TaskStatus;
            priority?: number;
        }) => tasksApi.move(id, status, priority),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to move task');
        },
    });
}

export function useExecuteTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => tasksApi.execute(id),
        onSuccess: (_, taskId) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
            toast.success('Task execution started');
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || error.response?.data?.detail || 'Failed to start execution';
            toast.error(message);
        },
    });
}
