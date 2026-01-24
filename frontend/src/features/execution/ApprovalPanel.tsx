import { useState } from 'react';
import { Check, X, GitMerge, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface ApprovalPanelProps {
    attemptId: string;
    taskTitle: string;
    gitBranch?: string;
    filesChanged?: string[];
    onApprove: (attemptId: string) => Promise<void>;
    onReject: (attemptId: string, feedback: string) => Promise<void>;
    isApproving?: boolean;
    isRejecting?: boolean;
}

export const ApprovalPanel = ({
    attemptId,
    taskTitle,
    gitBranch,
    filesChanged = [],
    onApprove,
    onReject,
    isApproving = false,
    isRejecting = false,
}: ApprovalPanelProps) => {
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleApprove = async () => {
        setError(null);
        try {
            await onApprove(attemptId);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to approve');
        }
    };

    const handleReject = async () => {
        setError(null);
        try {
            await onReject(attemptId, feedback);
            setShowRejectModal(false);
            setFeedback('');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to reject');
        }
    };

    const isLoading = isApproving || isRejecting;

    return (
        <>
            <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 bg-slate-800 border-b border-slate-700">
                    <h3 className="text-sm font-medium text-white">Review & Approve</h3>
                    <p className="text-xs text-slate-400 mt-1">{taskTitle}</p>
                </div>

                {/* Info section */}
                <div className="p-4 space-y-4">
                    {/* Git branch */}
                    {gitBranch && (
                        <div className="flex items-center gap-2 text-sm">
                            <GitMerge className="h-4 w-4 text-purple-400" />
                            <span className="text-slate-400">Branch:</span>
                            <code className="px-2 py-0.5 bg-slate-800 rounded text-purple-300 text-xs">
                                {gitBranch}
                            </code>
                        </div>
                    )}

                    {/* Files changed */}
                    {filesChanged.length > 0 && (
                        <div className="text-sm">
                            <span className="text-slate-400">Files changed: </span>
                            <span className="text-white">{filesChanged.length}</span>
                            <div className="mt-2 max-h-32 overflow-y-auto bg-slate-950 rounded p-2">
                                {filesChanged.slice(0, 10).map((file) => (
                                    <div key={file} className="text-xs text-slate-300 font-mono py-0.5 truncate">
                                        {file}
                                    </div>
                                ))}
                                {filesChanged.length > 10 && (
                                    <div className="text-xs text-slate-500 pt-1">
                                        +{filesChanged.length - 10} more files
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Warning */}
                    <div className="flex items-start gap-2 text-xs text-yellow-400 bg-yellow-500/10 rounded p-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>
                            Approving will merge the changes into the main branch. Please review the diff and
                            test results carefully.
                        </span>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded p-2">
                            <AlertTriangle className="h-4 w-4" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-4 py-3 bg-slate-800 border-t border-slate-700 flex items-center justify-end gap-3">
                    <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isRejecting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <X className="h-4 w-4" />
                        )}
                        Reject
                    </button>
                    <button
                        onClick={handleApprove}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isApproving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Check className="h-4 w-4" />
                        )}
                        Approve & Merge
                    </button>
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-md mx-4 shadow-2xl">
                        <div className="px-6 py-4 border-b border-slate-700">
                            <h3 className="text-lg font-semibold text-white">Reject Changes</h3>
                            <p className="text-sm text-slate-400 mt-1">
                                Provide feedback on why these changes are being rejected.
                            </p>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm text-slate-300 mb-2">Feedback (optional)</label>
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Explain what needs to be fixed or improved..."
                                className="w-full h-32 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                            />
                            {error && (
                                <div className="mt-3 text-xs text-red-400 bg-red-500/10 rounded p-2">
                                    {error}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-slate-800 rounded-b-xl flex items-center justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setFeedback('');
                                    setError(null);
                                }}
                                disabled={isRejecting}
                                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={isRejecting}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isRejecting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                                Reject Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ApprovalPanel;
