import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, ProjectCreate } from '@/api/projects';
import { toast } from 'sonner';

export function useProjects() {
    return useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const response = await projectsApi.list();
            // API returns paginated response with { count, next, previous, results }
            // Return just the results array
            return response.data.results || response.data;
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

export function useDeleteProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (projectId: string) => projectsApi.delete(projectId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success('Project deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to delete project');
        },
    });
}

export function useExecuteAllTasks() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (projectId: string) => projectsApi.executeAllTasks(projectId),
        onSuccess: (response, projectId) => {
            queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
            queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
            const scheduled = response.data.scheduled.length;
            const waiting = response.data.waiting;
            const running = response.data.already_running;

            if (scheduled > 0) {
                toast.success(`Scheduled ${scheduled} tasks for execution`);
            } else if (running > 0 || waiting > 0) {
                toast.info(`Execution ongoing: ${running} running, ${waiting} waiting`);
            } else {
                toast.info('No ready tasks to execute');
            }
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to start execution');
        },
    });
}

