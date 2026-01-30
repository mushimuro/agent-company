import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localAccessApi, WritableRootCreate } from '@/api/localAccess';
import { toast } from 'sonner';

export function useWritableRoots() {
    return useQuery({
        queryKey: ['writable-roots'],
        queryFn: async () => {
            const response = await localAccessApi.listWritableRoots();
            // Handle paginated response from DRF
            return response.data.results || response.data;
        },
    });
}

export function useCreateWritableRoot() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: WritableRootCreate) => localAccessApi.createWritableRoot(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['writable-roots'] });
            toast.success('Writable root added successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to add writable root');
        },
    });
}

export function useDeleteWritableRoot() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => localAccessApi.deleteWritableRoot(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['writable-roots'] });
            toast.success('Writable root removed');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to remove writable root');
        },
    });
}

export function useAuditLogs(params?: any) {
    return useQuery({
        queryKey: ['audit-logs', params],
        queryFn: async () => {
            const response = await localAccessApi.listAuditLogs(params);
            // Handle paginated response from DRF
            return response.data.results || response.data;
        },
    });
}
