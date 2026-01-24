import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';
import { X, Sparkles, ChevronRight, Check, Edit2, Trash2 } from 'lucide-react';
import { useInitializeWithPM, useApproveDecomposition, useRejectDecomposition } from '@/hooks/usePMDecomposition';
import { GeneratedTask, PMDecomposition } from '@/api/projects';

interface PMWizardProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    projectName: string;
}

const AGENT_ROLE_COLORS: Record<string, string> = {
    PM: 'bg-purple-100 text-purple-800',
    FRONTEND: 'bg-blue-100 text-blue-800',
    BACKEND: 'bg-green-100 text-green-800',
    QA: 'bg-orange-100 text-orange-800',
    DEVOPS: 'bg-gray-100 text-gray-800',
};

const MODELS = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Fast and cost-effective' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'High quality results' },
];

type WizardStep = 'input' | 'loading' | 'review';

export const PMWizard = ({ isOpen, onClose, projectId, projectName }: PMWizardProps) => {
    const [step, setStep] = useState<WizardStep>('input');
    const [requirements, setRequirements] = useState('');
    const [model, setModel] = useState('gemini-2.5-flash');
    const [decomposition, setDecomposition] = useState<PMDecomposition | null>(null);
    const [editingTask, setEditingTask] = useState<number | null>(null);
    const [editedTasks, setEditedTasks] = useState<GeneratedTask[]>([]);

    const initializePM = useInitializeWithPM();
    const approveDecomposition = useApproveDecomposition();
    const rejectDecomposition = useRejectDecomposition();

    const handleSubmit = async () => {
        if (!requirements.trim()) return;

        setStep('loading');

        initializePM.mutate(
            { projectId, requirements, model },
            {
                onSuccess: (response) => {
                    setDecomposition(response.data);
                    setEditedTasks(response.data.generated_tasks);
                    setStep('review');
                },
                onError: () => {
                    setStep('input');
                },
            }
        );
    };

    const handleApprove = () => {
        if (!decomposition) return;

        approveDecomposition.mutate(
            { projectId, decompositionId: decomposition.id },
            {
                onSuccess: () => {
                    handleClose();
                },
            }
        );
    };

    const handleReject = () => {
        if (!decomposition) return;

        rejectDecomposition.mutate(
            { projectId, decompositionId: decomposition.id },
            {
                onSuccess: () => {
                    setStep('input');
                    setDecomposition(null);
                    setEditedTasks([]);
                },
            }
        );
    };

    const handleClose = () => {
        setStep('input');
        setRequirements('');
        setDecomposition(null);
        setEditedTasks([]);
        setEditingTask(null);
        onClose();
    };

    const handleTaskEdit = (index: number, field: keyof GeneratedTask, value: string) => {
        const updated = [...editedTasks];
        updated[index] = { ...updated[index], [field]: value };
        setEditedTasks(updated);
    };

    const handleTaskDelete = (index: number) => {
        setEditedTasks(editedTasks.filter((_, i) => i !== index));
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
            <DialogBackdrop
                transition
                className="fixed inset-0 bg-gray-500/75 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
            />

            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <DialogPanel
                        transition
                        className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-3xl data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <Sparkles className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <DialogTitle as="h3" className="text-lg font-semibold text-white">
                                            PM Agent - Task Decomposition
                                        </DialogTitle>
                                        <p className="text-sm text-white/80">{projectName}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="rounded-md text-white/80 hover:text-white focus:outline-none"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            {/* Progress Steps */}
                            <div className="flex items-center mt-4 space-x-2">
                                <StepIndicator
                                    step={1}
                                    label="Requirements"
                                    active={step === 'input'}
                                    completed={step !== 'input'}
                                />
                                <ChevronRight className="h-4 w-4 text-white/50" />
                                <StepIndicator
                                    step={2}
                                    label="Analysis"
                                    active={step === 'loading'}
                                    completed={step === 'review'}
                                />
                                <ChevronRight className="h-4 w-4 text-white/50" />
                                <StepIndicator
                                    step={3}
                                    label="Review"
                                    active={step === 'review'}
                                    completed={false}
                                />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
                            {step === 'input' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Describe your requirements
                                        </label>
                                        <textarea
                                            rows={6}
                                            className="w-full border border-gray-300 rounded-lg shadow-sm py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                                            placeholder="Describe what you want to build. Be specific about features, user flows, and technical requirements..."
                                            value={requirements}
                                            onChange={(e) => setRequirements(e.target.value)}
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            Minimum 10 characters. The PM Agent will analyze your requirements and generate tasks.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Model
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {MODELS.map((m) => (
                                                <button
                                                    key={m.value}
                                                    type="button"
                                                    onClick={() => setModel(m.value)}
                                                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                                                        model === m.value
                                                            ? 'border-purple-500 bg-purple-50'
                                                            : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                                >
                                                    <div className="font-medium text-sm text-gray-900">
                                                        {m.label}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {m.description}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 'loading' && (
                                <div className="py-12 text-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
                                        <Sparkles className="h-8 w-8 text-purple-600 animate-pulse" />
                                    </div>
                                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                                        PM Agent is analyzing your requirements...
                                    </h4>
                                    <p className="text-sm text-gray-500">
                                        This may take a moment. The agent is reading your codebase and generating tasks.
                                    </p>
                                    <div className="mt-6">
                                        <div className="h-1 w-48 mx-auto bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-[loading_1.5s_ease-in-out_infinite]" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 'review' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium text-gray-900">
                                                Generated Tasks ({editedTasks.length})
                                            </h4>
                                            <p className="text-sm text-gray-500">
                                                Review and edit tasks before creating them
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {editedTasks.map((task, index) => (
                                            <div
                                                key={index}
                                                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                                            >
                                                {editingTask === index ? (
                                                    <div className="space-y-3">
                                                        <input
                                                            type="text"
                                                            className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                            value={task.title}
                                                            onChange={(e) => handleTaskEdit(index, 'title', e.target.value)}
                                                        />
                                                        <textarea
                                                            rows={2}
                                                            className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                            value={task.description}
                                                            onChange={(e) => handleTaskEdit(index, 'description', e.target.value)}
                                                        />
                                                        <div className="flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingTask(null)}
                                                                className="px-3 py-1 text-sm font-medium text-purple-600 hover:text-purple-700"
                                                            >
                                                                Done
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center space-x-2 mb-1">
                                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${AGENT_ROLE_COLORS[task.agent_role] || 'bg-gray-100 text-gray-800'}`}>
                                                                        {task.agent_role}
                                                                    </span>
                                                                    <span className="text-xs text-gray-400">
                                                                        Priority: {task.priority}
                                                                    </span>
                                                                </div>
                                                                <h5 className="font-medium text-gray-900">
                                                                    {task.title}
                                                                </h5>
                                                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                                                    {task.description}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center space-x-1 ml-4">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditingTask(index)}
                                                                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                                                                >
                                                                    <Edit2 className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleTaskDelete(index)}
                                                                    className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 px-6 py-4 flex justify-between">
                            {step === 'input' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={requirements.length < 10 || initializePM.isPending}
                                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        <span>Generate Tasks</span>
                                    </button>
                                </>
                            )}

                            {step === 'loading' && (
                                <>
                                    <div />
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
                                    >
                                        Cancel
                                    </button>
                                </>
                            )}

                            {step === 'review' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleReject}
                                        disabled={rejectDecomposition.isPending}
                                        className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                                    >
                                        Reject & Start Over
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleApprove}
                                        disabled={approveDecomposition.isPending || editedTasks.length === 0}
                                        className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                                    >
                                        <Check className="h-4 w-4" />
                                        <span>
                                            {approveDecomposition.isPending
                                                ? 'Creating...'
                                                : `Create ${editedTasks.length} Tasks`
                                            }
                                        </span>
                                    </button>
                                </>
                            )}
                        </div>
                    </DialogPanel>
                </div>
            </div>
        </Dialog>
    );
};

interface StepIndicatorProps {
    step: number;
    label: string;
    active: boolean;
    completed: boolean;
}

const StepIndicator = ({ step, label, active, completed }: StepIndicatorProps) => (
    <div className="flex items-center space-x-2">
        <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                completed
                    ? 'bg-white text-purple-600'
                    : active
                        ? 'bg-white text-purple-600'
                        : 'bg-white/20 text-white/60'
            }`}
        >
            {completed ? <Check className="h-3 w-3" /> : step}
        </div>
        <span className={`text-sm ${active || completed ? 'text-white' : 'text-white/60'}`}>
            {label}
        </span>
    </div>
);
