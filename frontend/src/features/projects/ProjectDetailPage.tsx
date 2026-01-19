import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import { KanbanBoard } from '@/features/kanban/KanbanBoard';
import { CreateTaskModal } from '@/features/kanban/CreateTaskModal';
import {
    ArrowLeft,
    Settings,
    Plus,
    GitBranch,
    Terminal
} from 'lucide-react';

export const ProjectDetailPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { data: project, isLoading, error } = useProject(projectId);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="text-center py-12">
                <h3 className="text-lg font-medium text-red-600">
                    {(error as any)?.message || 'Project not found'}
                </h3>
                <Link to="/projects" className="mt-4 text-blue-600 hover:text-blue-500">
                    Back to Projects
                </Link>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            {/* Header */}
            <div className="flex-none mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link
                            to="/projects"
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                            <div className="flex items-center text-sm text-gray-500 mt-1 space-x-4">
                                <span className="flex items-center">
                                    <Terminal size={14} className="mr-1" />
                                    {project.repo_path}
                                </span>
                                <span className="flex items-center">
                                    <GitBranch size={14} className="mr-1" />
                                    main
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button className="p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100">
                            <Settings size={20} />
                        </button>
                        <button
                            onClick={() => setIsTaskModalOpen(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                        >
                            <Plus className="-ml-1 mr-2 h-5 w-5" />
                            New Task
                        </button>
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 min-h-0">
                <KanbanBoard projectId={project.id} />
            </div>

            <CreateTaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                projectId={project.id}
            />
        </div>
    );
};
