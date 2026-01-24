import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects';
import { toast } from 'sonner';

export function useDecompositions(projectId: string | undefined) {
    return useQuery({
        queryKey: ['decompositions', projectId],
        queryFn: async () => {
            if (!projectId) throw new Error('Project ID required');
            const response = await projectsApi.getDecompositions(projectId);
            return response.data;
        },
        enabled: !!projectId,
    });
}

export function useInitializeWithPM() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            projectId,
            requirements,
            model
        }: {
            projectId: string;
            requirements: string;
            model?: string;
        }) => projectsApi.initializeWithPM(projectId, requirements, model),
        onSuccess: (response, { projectId }) => {
            queryClient.invalidateQueries({ queryKey: ['decompositions', projectId] });
            toast.success('PM Agent completed task decomposition');
            return response.data;
        },
        onError: (error: any) => {
            const message = error.response?.data?.error ||
                error.response?.data?.detail ||
                'Failed to decompose requirements';
            toast.error(message);
        },
    });
}

export function useApproveDecomposition() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            projectId,
            decompositionId
        }: {
            projectId: string;
            decompositionId: string;
        }) => projectsApi.approveDecomposition(projectId, decompositionId),
        onSuccess: (response, { projectId }) => {
            queryClient.invalidateQueries({ queryKey: ['decompositions', projectId] });
            queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
            queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
            toast.success(`Created ${response.data.tasks_created} tasks`);
        },
        onError: (error: any) => {
            const message = error.response?.data?.error ||
                error.response?.data?.detail ||
                'Failed to approve decomposition';
            toast.error(message);
        },
    });
}

export function useRejectDecomposition() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            projectId,
            decompositionId
        }: {
            projectId: string;
            decompositionId: string;
        }) => projectsApi.rejectDecomposition(projectId, decompositionId),
        onSuccess: (_, { projectId }) => {
            queryClient.invalidateQueries({ queryKey: ['decompositions', projectId] });
            toast.success('Decomposition rejected');
        },
        onError: (error: any) => {
            const message = error.response?.data?.error ||
                error.response?.data?.detail ||
                'Failed to reject decomposition';
            toast.error(message);
        },
    });
}
