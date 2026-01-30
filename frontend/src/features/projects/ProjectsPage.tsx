import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects, useDeleteProject } from '@/hooks/useProjects';
import { Plus, Folder, GitBranch, Clock, Sparkles, ArrowRight, Trash2 } from 'lucide-react';
import { CreateProjectModal } from './CreateProjectModal';

export const ProjectsPage = () => {
    const { data: projects, isLoading, error, refetch } = useProjects();
    const deleteProject = useDeleteProject();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const handleModalClose = () => {
        setIsModalOpen(false);
        // Force refetch when modal closes
        refetch();
    };

    const handleDelete = (e: React.MouseEvent, projectId: string) => {
        e.preventDefault(); // Prevent navigation
        e.stopPropagation();
        setDeleteConfirm(projectId);
    };

    const confirmDelete = (e: React.MouseEvent, projectId: string) => {
        e.preventDefault();
        e.stopPropagation();
        deleteProject.mutate(projectId);
        setDeleteConfirm(null);
    };

    const cancelDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDeleteConfirm(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center space-y-4">
                    <div className="spinner h-12 w-12 mx-auto"></div>
                    <p className="text-[--color-text-secondary] font-medium">Loading projects...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card-elevated p-12 text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-[--color-accent-error]/10 rounded-[--radius-lg] flex items-center justify-center mx-auto mb-4">
                    <Folder className="h-8 w-8 text-[--color-accent-error]" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-bold text-[--color-accent-error] mb-2">Error loading projects</h3>
                <p className="text-[--color-text-secondary]">
                    {(error as any)?.response?.data?.detail || (error as any)?.message || 'Unknown error occurred'}
                </p>
                <button 
                    onClick={() => refetch()}
                    className="btn-primary mt-4"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Header Section */}
            <div className="flex items-center justify-between animate-slide-up">
                <div>
                    <h1 className="text-5xl font-extrabold tracking-tight mb-3">
                        Your <span className="text-accent">Projects</span>
                    </h1>
                    <p className="text-[--color-text-secondary] text-lg">
                        Manage and organize your AI-powered development projects
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary group"
                >
                    <Plus className="mr-2 h-5 w-5" strokeWidth={2.5} />
                    New Project
                    <ArrowRight className="ml-2 h-5 w-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" strokeWidth={2.5} />
                </button>
            </div>

            {/* Empty State */}
            {!projects?.length ? (
                <div className="card-elevated p-20 text-center animate-scale-in">
                    <div className="max-w-lg mx-auto space-y-8">
                        <div className="relative inline-block">
                            <div className="w-32 h-32 bg-gradient-to-br from-[--color-accent-primary] to-[--color-accent-secondary] rounded-[--radius-xl] flex items-center justify-center shadow-[--shadow-accent] animate-glow">
                                <Folder className="h-16 w-16 text-[--color-bg-primary]" strokeWidth={2} />
                            </div>
                            <div className="absolute -top-3 -right-3 w-10 h-10 bg-[--color-accent-secondary] rounded-full flex items-center justify-center shadow-lg animate-pulse">
                                <Sparkles className="h-5 w-5 text-[--color-bg-primary]" strokeWidth={2.5} />
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <h3 className="text-3xl font-bold">
                                No projects yet
                            </h3>
                            <p className="text-[--color-text-secondary] text-lg leading-relaxed max-w-md mx-auto">
                                Create your first project and let AI agents help you manage tasks and execute code seamlessly
                            </p>
                        </div>

                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="btn-primary group text-lg"
                        >
                            <Plus className="mr-2 h-5 w-5" strokeWidth={2.5} />
                            Create Your First Project
                            <Sparkles className="ml-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            ) : (
                /* Projects Grid */
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project, index) => (
                        <Link
                            key={project.id}
                            to={`/projects/${project.id}`}
                            className="group block animate-slide-up"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className="card-hover h-full p-6 space-y-4 relative">
                                {/* Delete Button */}
                                <button
                                    onClick={(e) => handleDelete(e, project.id)}
                                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-10"
                                    title="Delete project"
                                >
                                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                                </button>

                                {/* Project Icon & Title */}
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-[--color-accent-primary] to-[--color-accent-secondary] rounded-[--radius-lg] flex items-center justify-center shadow-md group-hover:shadow-[--shadow-accent] transition-all duration-200">
                                        <Folder className="h-7 w-7 text-[--color-bg-primary]" strokeWidth={2} />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-8">
                                        <h3 className="text-xl font-bold text-[--color-text-primary] group-hover:text-[--color-accent-primary] truncate transition-colors mb-1">
                                            {project.name}
                                        </h3>
                                        <p className="text-xs text-[--color-text-tertiary] truncate">
                                            {project.repo_path}
                                        </p>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-[--color-border]"></div>

                                {/* Stats */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[--color-text-secondary]">
                                        <div className="w-10 h-10 bg-[--color-surface-hover] rounded-[--radius-md] flex items-center justify-center">
                                            <GitBranch className="h-5 w-5" strokeWidth={2} />
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-[--color-text-primary]">
                                                {project.task_count}
                                            </p>
                                            <p className="text-xs text-[--color-text-tertiary]">
                                                tasks
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-[--color-text-tertiary]">
                                        <Clock className="h-4 w-4" strokeWidth={2} />
                                        <span className="text-xs font-medium">
                                            {new Date(project.updated_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                </div>

                                {/* View Project Link */}
                                <div className="pt-2">
                                    <div className="flex items-center justify-between text-sm font-semibold text-[--color-accent-primary] group-hover:text-[--color-accent-primary-hover] transition-colors">
                                        <span>View project</span>
                                        <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            <CreateProjectModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
            />

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-[--color-bg-primary] rounded-[--radius-xl] p-6 max-w-md w-full shadow-[--shadow-elevated] animate-scale-in">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 bg-red-100 rounded-[--radius-lg] flex items-center justify-center flex-shrink-0">
                                <Trash2 className="h-6 w-6 text-red-600" strokeWidth={2} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-[--color-text-primary] mb-2">
                                    Delete Project
                                </h3>
                                <p className="text-[--color-text-secondary] text-sm leading-relaxed">
                                    Are you sure you want to delete this project? This action cannot be undone and will remove all associated tasks and data.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={cancelDelete}
                                className="flex-1 px-4 py-2.5 bg-[--color-surface] text-[--color-text-primary] rounded-[--radius-lg] font-semibold hover:bg-[--color-surface-hover] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={(e) => confirmDelete(e, deleteConfirm)}
                                disabled={deleteProject.isPending}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-[--radius-lg] font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {deleteProject.isPending ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
