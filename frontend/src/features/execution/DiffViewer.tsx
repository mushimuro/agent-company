import { useState, useMemo } from 'react';
import { parseDiff, Diff, Hunk, HunkData, FileData } from 'react-diff-view';
import 'react-diff-view/style/index.css';
import { FileText, Plus, Minus, ChevronDown, ChevronRight, Binary } from 'lucide-react';

interface DiffViewerProps {
    diff: string;
    viewType?: 'split' | 'unified';
    onFileSelect?: (fileName: string) => void;
}

interface FileStats {
    additions: number;
    deletions: number;
}

export const DiffViewer = ({
    diff,
    viewType = 'unified',
    onFileSelect,
}: DiffViewerProps) => {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
    const [currentViewType, setCurrentViewType] = useState(viewType);

    // Parse the diff
    const files = useMemo(() => {
        if (!diff) return [];
        try {
            const parsed = parseDiff(diff);
            return parsed;
        } catch (e) {
            console.error('Failed to parse diff:', e);
            return [];
        }
    }, [diff]);

    // Calculate stats for each file
    const fileStats = useMemo(() => {
        const stats: Record<string, FileStats> = {};
        files.forEach((file) => {
            let additions = 0;
            let deletions = 0;
            file.hunks.forEach((hunk) => {
                hunk.changes.forEach((change) => {
                    if (change.type === 'insert') additions++;
                    else if (change.type === 'delete') deletions++;
                });
            });
            stats[file.newPath || file.oldPath || 'unknown'] = { additions, deletions };
        });
        return stats;
    }, [files]);

    // Calculate total stats
    const totalStats = useMemo(() => {
        let additions = 0;
        let deletions = 0;
        Object.values(fileStats).forEach((stat) => {
            additions += stat.additions;
            deletions += stat.deletions;
        });
        return { additions, deletions };
    }, [fileStats]);

    const toggleFile = (fileName: string) => {
        const newExpanded = new Set(expandedFiles);
        if (newExpanded.has(fileName)) {
            newExpanded.delete(fileName);
        } else {
            newExpanded.add(fileName);
        }
        setExpandedFiles(newExpanded);
        setSelectedFile(fileName);
        onFileSelect?.(fileName);
    };

    const toggleAllFiles = () => {
        if (expandedFiles.size === files.length) {
            setExpandedFiles(new Set());
        } else {
            setExpandedFiles(new Set(files.map(f => f.newPath || f.oldPath || 'unknown')));
        }
    };

    const getFileIcon = (file: FileData) => {
        if (file.type === 'add') {
            return <Plus className="h-4 w-4 text-green-500" />;
        }
        if (file.type === 'delete') {
            return <Minus className="h-4 w-4 text-red-500" />;
        }
        if (file.isBinary) {
            return <Binary className="h-4 w-4 text-gray-400" />;
        }
        return <FileText className="h-4 w-4 text-gray-400" />;
    };

    if (!diff) {
        return (
            <div className="flex items-center justify-center h-48 bg-slate-900 rounded-lg border border-slate-700">
                <p className="text-slate-400">No changes to display</p>
            </div>
        );
    }

    if (files.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 bg-slate-900 rounded-lg border border-slate-700">
                <p className="text-slate-400">Unable to parse diff</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-4">
                    <h3 className="text-sm font-medium text-white">
                        {files.length} file{files.length !== 1 ? 's' : ''} changed
                    </h3>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="flex items-center gap-1 text-green-400">
                            <Plus className="h-3 w-3" />
                            {totalStats.additions}
                        </span>
                        <span className="flex items-center gap-1 text-red-400">
                            <Minus className="h-3 w-3" />
                            {totalStats.deletions}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleAllFiles}
                        className="px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                        {expandedFiles.size === files.length ? 'Collapse All' : 'Expand All'}
                    </button>
                    <div className="flex items-center gap-1 bg-slate-700 rounded-md p-0.5">
                        <button
                            onClick={() => setCurrentViewType('unified')}
                            className={`px-2 py-1 text-xs rounded ${currentViewType === 'unified'
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Unified
                        </button>
                        <button
                            onClick={() => setCurrentViewType('split')}
                            className={`px-2 py-1 text-xs rounded ${currentViewType === 'split'
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Split
                        </button>
                    </div>
                </div>
            </div>

            {/* File list and diffs */}
            <div className="divide-y divide-slate-700">
                {files.map((file, index) => {
                    const fileName = file.newPath || file.oldPath || `file-${index}`;
                    const isExpanded = expandedFiles.has(fileName);
                    const stats = fileStats[fileName] || { additions: 0, deletions: 0 };

                    return (
                        <div key={fileName} className="bg-slate-900">
                            {/* File header */}
                            <button
                                onClick={() => toggleFile(fileName)}
                                className={`w-full flex items-center justify-between px-4 py-2 text-left hover:bg-slate-800 transition-colors ${selectedFile === fileName ? 'bg-slate-800' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                    )}
                                    {getFileIcon(file)}
                                    <span className="text-sm text-white truncate">{fileName}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs flex-shrink-0">
                                    {stats.additions > 0 && (
                                        <span className="text-green-400">+{stats.additions}</span>
                                    )}
                                    {stats.deletions > 0 && (
                                        <span className="text-red-400">-{stats.deletions}</span>
                                    )}
                                </div>
                            </button>

                            {/* Diff content */}
                            {isExpanded && (
                                <div className="overflow-x-auto diff-view-wrapper">
                                    {file.isBinary ? (
                                        <div className="px-4 py-8 text-center text-slate-400">
                                            Binary file not shown
                                        </div>
                                    ) : (
                                        <Diff
                                            viewType={currentViewType}
                                            diffType={file.type}
                                            hunks={file.hunks}
                                            className="text-sm"
                                        >
                                            {(hunks: HunkData[]) =>
                                                hunks.map((hunk) => (
                                                    <Hunk
                                                        key={hunk.content}
                                                        hunk={hunk}
                                                    />
                                                )
                                                )
                                            }
                                        </Diff>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Custom styles */}
            <style>{`
        .diff-view-wrapper .diff {
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Consolas', monospace;
          font-size: 12px;
          line-height: 1.5;
        }

        .diff-view-wrapper .diff-gutter {
          background: #1e293b;
          color: #64748b;
          padding: 0 8px;
          text-align: right;
          user-select: none;
          min-width: 40px;
        }

        .diff-view-wrapper .diff-line {
          padding: 0 8px;
        }

        .diff-view-wrapper .diff-code-insert {
          background: rgba(34, 197, 94, 0.15);
        }

        .diff-view-wrapper .diff-code-delete {
          background: rgba(239, 68, 68, 0.15);
        }

        .diff-view-wrapper .diff-gutter-insert {
          background: rgba(34, 197, 94, 0.3);
          color: #22c55e;
        }

        .diff-view-wrapper .diff-gutter-delete {
          background: rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .diff-view-wrapper .diff-hunk-header {
          background: #334155;
          color: #94a3b8;
          padding: 4px 8px;
        }

        .diff-view-wrapper .diff-code {
          color: #e2e8f0;
          white-space: pre;
        }

        .diff-view-wrapper table {
          width: 100%;
          border-collapse: collapse;
        }
      `}</style>
        </div>
    );
};

export default DiffViewer;
