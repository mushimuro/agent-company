import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Play, Clock, AlertCircle, CheckCircle2, Terminal } from 'lucide-react';
import { useTask } from '@/hooks/useTasks';
import { useTaskAttempts, useStartAttempt, useApproveAttempt, useRejectAttempt } from '@/hooks/useAttempts';
import { LiveLogViewer } from '@/features/execution/LiveLogViewer';
import { DiffViewer } from '@/features/execution/DiffViewer';
import { QualityGatesPanel } from '@/features/execution/QualityGatesPanel';
import { ApprovalPanel } from '@/features/execution/ApprovalPanel';
import { useWebSocket } from '@/hooks/useWebSocket';

interface TaskDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskId: string | null;
    projectId: string;
}

export const TaskDetailModal = ({ isOpen, onClose, taskId, projectId }: TaskDetailModalProps) => {
    const { data: task, isLoading: taskLoading } = useTask(taskId ? taskId : undefined);
    const { data: attempts, isLoading: attemptsLoading } = useTaskAttempts(taskId ? taskId : undefined);

    const startAttempt = useStartAttempt();
    const approveAttempt = useApproveAttempt();
    const rejectAttempt = useRejectAttempt();

    const [activeTab, setActiveTab] = useState<'overview' | 'execution'>('overview');

    // Get latest attempt
    const latestAttempt = attempts?.length ? attempts[0] : null;

    // WebSocket for live logs
    const [liveLogs, setLiveLogs] = useState<any[]>([]);

    useWebSocket(projectId, {
        onMessage: (message) => {
            if (message.type === 'attempt_event' && latestAttempt?.id && message.payload?.attempt_id === latestAttempt.id) {
                // Check if internal payload structure matches expectation
                // Sometimes message structure can vary. 
                // Assuming message is { type: 'attempt_event', event_type: '...', message: '...', ... } directly based on tasks.py
                // Actually tasks.py sends: 
                // { 'type': 'attempt_event', 'event_type': ..., 'message': ..., 'metadata': ..., 'timestamp': ... }
                // So message itself is the log event
                setLiveLogs(prev => [...prev, message]);
            }
        }
    });

    useEffect(() => {
        if (latestAttempt?.events) {
            setLiveLogs(latestAttempt.events);
        } else {
            setLiveLogs([]);
        }
    }, [latestAttempt?.id, latestAttempt?.events]);

    const handleStartExecution = () => {
        if (taskId) {
            startAttempt.mutate(taskId);
            setActiveTab('execution');
        }
    };

    const handleApprove = async (attemptId: string) => {
        await approveAttempt.mutateAsync(attemptId);
        onClose();
    };

    const handleReject = async (attemptId: string, feedback: string) => {
        await rejectAttempt.mutateAsync({ attemptId, feedback });
    };

    if (!taskId) return null;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all h-[90vh] flex flex-col">
                                {taskLoading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : task ? (
                                    <>
                                        {/* Header */}
                                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 flex-none">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${task.agent_role === 'BACKEND' ? 'bg-green-100 text-green-800' :
                                                        task.agent_role === 'FRONTEND' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {task.agent_role}
                                                    </span>
                                                    <span className="text-xs text-gray-500">ID: {task.id.slice(0, 8)}</span>
                                                </div>
                                                <DialogTitle as="h3" className="text-xl font-bold text-gray-900">
                                                    {task.title}
                                                </DialogTitle>
                                            </div>
                                            <button
                                                onClick={onClose}
                                                className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        {/* Tabs */}
                                        <div className="flex border-b border-gray-200 px-6 flex-none">
                                            <button
                                                onClick={() => setActiveTab('overview')}
                                                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview'
                                                    ? 'border-blue-600 text-blue-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                Overview
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('execution')}
                                                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'execution'
                                                    ? 'border-blue-600 text-blue-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                Execution
                                            </button>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                                            {activeTab === 'overview' ? (
                                                <div className="space-y-6">
                                                    <div className="bg-white p-6 rounded-xl border border-gray-200">
                                                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Description</h4>
                                                        <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
                                                    </div>

                                                    <div className="bg-white p-6 rounded-xl border border-gray-200">
                                                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Acceptance Criteria</h4>
                                                        <ul className="space-y-2">
                                                            {task.acceptance_criteria?.map((criteria: string, idx: number) => (
                                                                <li key={idx} className="flex items-start gap-2">
                                                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-none" />
                                                                    <span className="text-gray-700">{criteria}</span>
                                                                </li>
                                                            )) || <p className="text-gray-500 italic">No acceptance criteria defined.</p>}
                                                        </ul>
                                                    </div>

                                                    {task.status !== 'IN_PROGRESS' && task.status !== 'IN_REVIEW' && (
                                                        <div className="flex justify-end">
                                                            <button
                                                                onClick={handleStartExecution}
                                                                disabled={startAttempt.isPending}
                                                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                                                            >
                                                                <Play size={18} />
                                                                Start Execution
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {attemptsLoading ? (
                                                        <div className="text-center py-12">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                                                            <p className="mt-4 text-gray-500">Loading attempts...</p>
                                                        </div>
                                                    ) : latestAttempt ? (
                                                        <div className="space-y-6">
                                                            {/* Attempt Status Header */}
                                                            <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`p-2 rounded-lg ${latestAttempt.status === 'RUNNING' ? 'bg-blue-100 text-blue-600' :
                                                                        latestAttempt.status === 'SUCCESS' ? 'bg-green-100 text-green-600' :
                                                                            latestAttempt.status === 'FAILED' ? 'bg-red-100 text-red-600' :
                                                                                'bg-gray-100 text-gray-600'
                                                                        }`}>
                                                                        {latestAttempt.status === 'RUNNING' ? <Terminal size={20} className="animate-pulse" /> :
                                                                            latestAttempt.status === 'SUCCESS' ? <CheckCircle2 size={20} /> :
                                                                                latestAttempt.status === 'FAILED' ? <AlertCircle size={20} /> :
                                                                                    <Clock size={20} />}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-bold text-gray-900">
                                                                            Attempt #{attempts?.length}
                                                                        </h4>
                                                                        <p className="text-sm text-gray-500">
                                                                            {latestAttempt.started_at ? new Date(latestAttempt.started_at).toLocaleString() : 'Not started'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${latestAttempt.status === 'RUNNING' ? 'bg-blue-100 text-blue-700' :
                                                                        latestAttempt.status === 'SUCCESS' || latestAttempt.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                                            latestAttempt.status === 'FAILED' || latestAttempt.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                                                'bg-gray-100 text-gray-700'
                                                                        }`}>
                                                                        {latestAttempt.status}
                                                                    </span>
                                                                    {latestAttempt.agent_role && <div className="text-xs text-gray-400 mt-1">{latestAttempt.agent_role} Agent</div>}
                                                                </div>
                                                            </div>

                                                            {/* Logs */}
                                                            <LiveLogViewer
                                                                key={latestAttempt.id}
                                                                attemptId={latestAttempt.id}
                                                                logs={liveLogs}
                                                                isRunning={latestAttempt.status === 'RUNNING' || latestAttempt.status === 'QUEUED'}
                                                            />

                                                            {/* Quality Gates */}
                                                            {(latestAttempt.gate_results?.length > 0 || latestAttempt.status === 'RUNNING') && (
                                                                <QualityGatesPanel
                                                                    gateResults={(latestAttempt.gate_results || []).map(g => ({
                                                                        ...g,
                                                                        duration_seconds: g.duration_seconds || undefined
                                                                    }))}
                                                                    isLoading={latestAttempt.status === 'RUNNING'}
                                                                />
                                                            )}

                                                            {/* Diff Viewer (only if files changed) */}
                                                            {latestAttempt.diff && (
                                                                <DiffViewer
                                                                    diff={latestAttempt.diff}
                                                                />
                                                            )}

                                                            {/* Approval Panel */}
                                                            {(latestAttempt.status === 'SUCCESS') && (
                                                                <ApprovalPanel
                                                                    attemptId={latestAttempt.id}
                                                                    taskTitle={task.title}
                                                                    gitBranch={latestAttempt.git_branch}
                                                                    filesChanged={latestAttempt.files_changed}
                                                                    onApprove={handleApprove}
                                                                    onReject={handleReject}
                                                                    isApproving={approveAttempt.isPending}
                                                                    isRejecting={rejectAttempt.isPending}
                                                                />
                                                            )}

                                                            {/* Error Message */}
                                                            {latestAttempt.error_message && (
                                                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                                                                    <h5 className="font-bold mb-1">Error</h5>
                                                                    <p>{latestAttempt.error_message}</p>
                                                                </div>
                                                            )}

                                                            {/* Retry Button */}
                                                            {(latestAttempt.status === 'FAILED' || latestAttempt.status === 'REJECTED' || latestAttempt.status === 'CANCELLED') && (
                                                                <div className="flex justify-center pt-4">
                                                                    <button
                                                                        onClick={handleStartExecution}
                                                                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                                                                    >
                                                                        <Play size={18} />
                                                                        Retry execution
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                                <Play size={24} className="text-gray-400" />
                                                            </div>
                                                            <h3 className="text-lg font-medium text-gray-900">No executions yet</h3>
                                                            <p className="text-gray-500 mb-6">Start the agent to begin working on this task.</p>
                                                            <button
                                                                onClick={handleStartExecution}
                                                                disabled={startAttempt.isPending}
                                                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                                                            >
                                                                <Play size={18} />
                                                                Start Execution
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-6 text-center text-red-600">Failed to load task details</div>
                                )}
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};
