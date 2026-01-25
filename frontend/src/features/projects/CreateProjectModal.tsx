import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';
import { X } from 'lucide-react';
import { useCreateProject } from '@/hooks/useProjects';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateProjectModal = ({ isOpen, onClose }: CreateProjectModalProps) => {
    const createProject = useCreateProject();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        repo_path: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        createProject.mutate(formData, {
            onSuccess: () => {
                setFormData({ name: '', description: '', repo_path: '' });
                onClose();
            },
        });
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <DialogBackdrop
                transition
                className="fixed inset-0 bg-gray-500/75 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
            />

            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <DialogPanel
                        transition
                        className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-lg data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
                    >
                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <div className="flex justify-between items-start mb-4">
                                <DialogTitle as="h3" className="text-lg leading-6 font-medium text-gray-900">
                                    Create New Project
                                </DialogTitle>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                                >
                                    <span className="sr-only">Close</span>
                                    <X className="h-6 w-6" aria-hidden="true" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                        Project Name
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        id="name"
                                        required
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="repo_path" className="block text-sm font-medium text-gray-700">
                                        Repository Path (Absolute Path)
                                    </label>
                                    <input
                                        type="text"
                                        name="repo_path"
                                        id="repo_path"
                                        required
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white placeholder:text-gray-400"
                                        placeholder="/home/user/projects/my-app"
                                        value={formData.repo_path}
                                        onChange={(e) => setFormData({ ...formData, repo_path: e.target.value })}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Local absolute path to the git repository
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                        Description
                                    </label>
                                    <textarea
                                        name="description"
                                        id="description"
                                        rows={3}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                    <button
                                        type="submit"
                                        disabled={createProject.isPending}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                                    >
                                        {createProject.isPending ? 'Creating...' : 'Create Project'}
                                    </button>
                                    <button
                                        type="button"
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                                        onClick={onClose}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </DialogPanel>
                </div>
            </div>
        </Dialog>
    );
};
