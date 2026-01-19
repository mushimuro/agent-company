import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects } from '@/hooks/useProjects';
import { Plus, Folder, GitBranch, Clock } from 'lucide-react';
import { CreateProjectModal } from './CreateProjectModal';

export const ProjectsPage = () => {
    const { data: projects, isLoading, error } = useProjects();
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <h3 className="text-lg font-medium text-red-600">Error loading projects</h3>
                <p className="mt-2 text-sm text-gray-500">{(error as any)?.message || 'Unknown error'}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    New Project
                </button>
            </div>

            {!projects?.length ? (
                <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-200">
                    <Folder className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
                    <div className="mt-6">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <Plus className="-ml-1 mr-2 h-5 w-5" />
                            New Project
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => (
                        <Link
                            key={project.id}
                            to={`/projects/${project.id}`}
                            className="block hover:no-underline group"
                        >
                            <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
                                <div className="px-4 py-5 sm:p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                                                <Folder className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <div className="ml-4">
                                                <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 truncate">
                                                    {project.name}
                                                </h3>
                                                {/* <p className="text-sm text-gray-500 truncate">{project.repo_path}</p> */}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <p className="text-sm text-gray-500 line-clamp-2">
                                            {/* Description could go here if added to API response */}
                                            {project.repo_path}
                                        </p>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                                        <div className="flex items-center">
                                            <GitBranch className="mr-1.5 h-4 w-4" />
                                            <span>{project.task_count} tasks</span>
                                        </div>
                                        <div className="flex items-center">
                                            <Clock className="mr-1.5 h-4 w-4" />
                                            <span>{new Date(project.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    {/* Optional: Add completion bar if needed */}
                                    {/* <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${project.completion_percentage}%` }}
                    />
                  </div> */}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            <CreateProjectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};
