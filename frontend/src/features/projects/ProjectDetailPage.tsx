import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject, useProjectStats, useExecuteAllTasks } from '@/hooks/useProjects';
import { useProjectDependencyGraph } from '@/hooks/useTasks';
import { KanbanBoard } from '@/features/kanban/KanbanBoard';
import { CreateTaskModal } from '@/features/kanban/CreateTaskModal';
import { TaskDetailModal } from '@/features/kanban/TaskDetailModal';
import { PMWizard } from '@/features/projects/PMWizard';
import DependencyGraph from '@/features/kanban/DependencyGraph';
import {
    ArrowLeft,
    Plus,
    Play,
    GitBranch,
    Terminal,
    PieChart,
    CheckCircle2,
    Sparkles,
    Columns,
    Network
} from 'lucide-react';

export const ProjectDetailPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { data: project, isLoading: projectLoading, error } = useProject(projectId);
    const { data: stats, isLoading: statsLoading } = useProjectStats(projectId);
    const { data: graphData } = useProjectDependencyGraph(projectId);
    const executeAllTasks = useExecuteAllTasks();

    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isPMWizardOpen, setIsPMWizardOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'kanban' | 'graph'>('kanban');
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    const handleTaskClick = (taskId: string) => {
        setSelectedTaskId(taskId);
    };

    const handleCloseTaskDetail = () => {
        setSelectedTaskId(null);
    };

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

                    <div className="flex items-center space-x-3">
                        {/* Stats Pills */}
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
                        </div>

                        {/* View Toggle */}
                        <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => setViewMode('kanban')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'kanban'
                                    ? 'bg-white shadow text-blue-600'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                title="Kanban Board"
                            >
                                <Columns size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('graph')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'graph'
                                    ? 'bg-white shadow text-blue-600'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                title="Dependency Graph"
                            >
                                <Network size={18} />
                            </button>
                        </div>

                        {/* Actions */}
                        <button
                            onClick={() => executeAllTasks.mutate(project.id)}
                            disabled={executeAllTasks.isPending}
                            className="inline-flex items-center px-4 py-2.5 border border-green-200 text-sm font-bold rounded-xl text-green-700 bg-green-50 hover:bg-green-100 transition-all ml-4 disabled:opacity-50"
                            title="Execute all ready tasks"
                        >
                            <Play className="-ml-1 mr-2 h-4 w-4" />
                            Run Batch
                        </button>

                        <button
                            onClick={() => setIsPMWizardOpen(true)}
                            className="inline-flex items-center px-4 py-2.5 border border-purple-200 text-sm font-bold rounded-xl text-purple-700 bg-purple-50 hover:bg-purple-100 transition-all ml-4"
                        >
                            <Sparkles className="-ml-1 mr-2 h-4 w-4" />
                            AI Plan
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

            {/* Content */}
            <div className="flex-1 min-h-0 relative">
                {viewMode === 'kanban' ? (
                    <KanbanBoard projectId={project.id} onTaskClick={handleTaskClick} />
                ) : (
                    <div className="h-full overflow-auto p-4">
                        {graphData ? (
                            <DependencyGraph
                                nodes={graphData.nodes}
                                edges={graphData.edges}
                                executionLevels={graphData.execution_levels}
                                hasCycles={graphData.has_cycles}
                                onTaskClick={handleTaskClick}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                Loading graph...
                            </div>
                        )}
                    </div>
                )}
            </div>

            <CreateTaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                projectId={project.id}
            />

            <PMWizard
                isOpen={isPMWizardOpen}
                onClose={() => setIsPMWizardOpen(false)}
                projectId={project.id}
                projectName={project.name}
            />

            {project && (
                <TaskDetailModal
                    isOpen={!!selectedTaskId}
                    onClose={handleCloseTaskDetail}
                    taskId={selectedTaskId}
                    projectId={project.id}
                />
            )}
        </div>
    );
};

