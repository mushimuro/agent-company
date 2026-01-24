import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attemptsApi, Attempt, AttemptListParams } from '@/api/attempts';
import { toast } from 'sonner';

export function useAttempts(params?: AttemptListParams) {
    return useQuery({
        queryKey: ['attempts', params],
        queryFn: async () => {
            const response = await attemptsApi.list(params);
            return response.data;
        },
    });
}

export function useAttempt(id: string | undefined) {
    return useQuery({
        queryKey: ['attempts', id],
        queryFn: async () => {
            if (!id) throw new Error('Attempt ID required');
            const response = await attemptsApi.get(id);
            return response.data;
        },
        enabled: !!id,
        refetchInterval: (query) => {
            // Refetch every 2 seconds while running
            const data = query.state.data as Attempt | undefined;
            if (data?.status === 'RUNNING' || data?.status === 'QUEUED') {
                return 2000;
            }
            return false;
        },
    });
}

export function useTaskAttempts(taskId: string | undefined) {
    return useQuery({
        queryKey: ['attempts', 'task', taskId],
        queryFn: async () => {
            if (!taskId) throw new Error('Task ID required');
            const response = await attemptsApi.list({ task: taskId });
            return response.data;
        },
        enabled: !!taskId,
    });
}

export function useStartAttempt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (taskId: string) => attemptsApi.start(taskId),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['attempts'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Attempt started');
            return response.data;
        },
        onError: (error: any) => {
            const message = error.response?.data?.error ||
                error.response?.data?.detail ||
                'Failed to start attempt';
            toast.error(message);
        },
    });
}

export function useApproveAttempt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (attemptId: string) => attemptsApi.approve(attemptId),
        onSuccess: (response, attemptId) => {
            queryClient.invalidateQueries({ queryKey: ['attempts'] });
            queryClient.invalidateQueries({ queryKey: ['attempts', attemptId] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            if (response.data.status === 'approved') {
                toast.success('Changes approved and merged');
            } else {
                toast.error(response.data.error || 'Merge failed');
            }
        },
        onError: (error: any) => {
            const message = error.response?.data?.error ||
                error.response?.data?.detail ||
                'Failed to approve attempt';
            toast.error(message);
        },
    });
}

export function useRejectAttempt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ attemptId, feedback }: { attemptId: string; feedback?: string }) =>
            attemptsApi.reject(attemptId, feedback),
        onSuccess: (_, { attemptId }) => {
            queryClient.invalidateQueries({ queryKey: ['attempts'] });
            queryClient.invalidateQueries({ queryKey: ['attempts', attemptId] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Attempt rejected');
        },
        onError: (error: any) => {
            const message = error.response?.data?.error ||
                error.response?.data?.detail ||
                'Failed to reject attempt';
            toast.error(message);
        },
    });
}

export function useCancelAttempt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (attemptId: string) => attemptsApi.cancel(attemptId),
        onSuccess: (_, attemptId) => {
            queryClient.invalidateQueries({ queryKey: ['attempts'] });
            queryClient.invalidateQueries({ queryKey: ['attempts', attemptId] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Attempt cancelled');
        },
        onError: (error: any) => {
            const message = error.response?.data?.error ||
                error.response?.data?.detail ||
                'Failed to cancel attempt';
            toast.error(message);
        },
    });
}
