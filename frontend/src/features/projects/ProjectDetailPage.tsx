import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject, useProjectStats } from '@/hooks/useProjects';
import { KanbanBoard } from '@/features/kanban/KanbanBoard';
import { CreateTaskModal } from '@/features/kanban/CreateTaskModal';
import {
    ArrowLeft,
    Settings,
    Plus,
    GitBranch,
    Terminal,
    PieChart,
    CheckCircle2,
    Users
} from 'lucide-react';

export const ProjectDetailPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { data: project, isLoading: projectLoading, error } = useProject(projectId);
    const { data: stats, isLoading: statsLoading } = useProjectStats(projectId);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    const isLoading = projectLoading || statsLoading;

    if (isLoading && !project) {
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
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                        <Link
                            to="/projects"
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{project.name}</h1>
                            <div className="flex items-center text-sm text-gray-500 mt-1 space-x-4">
                                <span className="flex items-center">
                                    <Terminal size={14} className="mr-1.5 text-gray-400" />
                                    {project.repo_path}
                                </span>
                                <span className="flex items-center">
                                    <GitBranch size={14} className="mr-1.5 text-gray-400" />
                                    main
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="hidden md:flex items-center space-x-6 mr-4 px-6 py-2 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="flex items-center space-x-2">
                                <CheckCircle2 size={16} className="text-green-500" />
                                <div className="text-xs">
                                    <span className="block font-bold text-gray-900">{stats?.done || 0}/{stats?.total_tasks || 0}</span>
                                    <span className="text-gray-400 font-medium">Completed</span>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 border-l border-gray-200 pl-6">
                                <PieChart size={16} className="text-blue-500" />
                                <div className="text-xs">
                                    <span className="block font-bold text-gray-900">{project.completion_percentage}%</span>
                                    <span className="text-gray-400 font-medium">Progress</span>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 border-l border-gray-200 pl-6">
                                <Users size={16} className="text-purple-500" />
                                <div className="text-xs">
                                    <span className="block font-bold text-gray-900">{Object.keys(stats?.by_role || {}).length}</span>
                                    <span className="text-gray-400 font-medium">Agents</span>
                                </div>
                            </div>
                        </div>

                        <button className="p-2.5 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-all border border-transparent">
                            <Settings size={20} />
                        </button>
                        <button
                            onClick={() => setIsTaskModalOpen(true)}
                            className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-bold rounded-xl shadow-lg shadow-blue-100 text-white bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200 active:scale-95 transition-all"
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
