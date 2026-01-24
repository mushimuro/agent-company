import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, ProjectCreate } from '@/api/projects';
import { toast } from 'sonner';

export function useProjects() {
    return useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const response = await projectsApi.list();
            return response.data;
        },
    });
}

export function useProject(id: string | undefined) {
    return useQuery({
        queryKey: ['projects', id],
        queryFn: async () => {
            if (!id) throw new Error('Project ID required');
            const response = await projectsApi.get(id);
            return response.data;
        },
        enabled: !!id,
    });
}

export function useCreateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: ProjectCreate) => projectsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success('Project created successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to create project');
        },
    });
}

export function useProjectStats(id: string | undefined) {
    return useQuery({
        queryKey: ['projects', id, 'stats'],
        queryFn: async () => {
            if (!id) throw new Error('Project ID required');
            const response = await projectsApi.stats(id);
            return response.data;
        },
        enabled: !!id,
    });
}
