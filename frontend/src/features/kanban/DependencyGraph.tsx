import { useMemo } from 'react';
import { GitBranch, Check, Clock, AlertCircle, Play, Pause } from 'lucide-react';

interface GraphNode {
    id: string;
    title: string;
    status: string;
    agent_role: string;
    priority: number;
}

interface GraphEdge {
    source: string;
    target: string;
}

interface ExecutionLevel {
    level: number;
    tasks: { id: string; title: string }[];
}

interface DependencyGraphProps {
    nodes: GraphNode[];
    edges: GraphEdge[];
    executionLevels?: ExecutionLevel[];
    hasCycles?: boolean;
    onTaskClick?: (taskId: string) => void;
    selectedTaskId?: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    TODO: { bg: 'bg-slate-700', text: 'text-slate-300', border: 'border-slate-600' },
    IN_PROGRESS: { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-500' },
    IN_REVIEW: { bg: 'bg-purple-900/50', text: 'text-purple-300', border: 'border-purple-500' },
    DONE: { bg: 'bg-green-900/50', text: 'text-green-300', border: 'border-green-500' },
    FAILED: { bg: 'bg-red-900/50', text: 'text-red-300', border: 'border-red-500' },
};

const ROLE_COLORS: Record<string, string> = {
    PM: 'bg-purple-500',
    FRONTEND: 'bg-blue-500',
    BACKEND: 'bg-green-500',
    QA: 'bg-orange-500',
    DEVOPS: 'bg-gray-500',
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'DONE':
            return <Check className="h-3 w-3 text-green-400" />;
        case 'IN_PROGRESS':
            return <Play className="h-3 w-3 text-blue-400" />;
        case 'IN_REVIEW':
            return <Pause className="h-3 w-3 text-purple-400" />;
        case 'FAILED':
            return <AlertCircle className="h-3 w-3 text-red-400" />;
        default:
            return <Clock className="h-3 w-3 text-slate-400" />;
    }
};

export const DependencyGraph = ({
    nodes,
    edges,
    executionLevels = [],
    hasCycles = false,
    onTaskClick,
    selectedTaskId,
}: DependencyGraphProps) => {
    // Group nodes by execution level
    const leveledNodes = useMemo(() => {
        if (executionLevels.length > 0) {
            return executionLevels.map((level) => ({
                level: level.level,
                nodes: level.tasks.map((t) => nodes.find((n) => n.id === t.id)).filter(Boolean) as GraphNode[],
            }));
        }

        // Fallback: group by status
        const statusOrder = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
        return statusOrder.map((status, idx) => ({
            level: idx,
            nodes: nodes.filter((n) => n.status === status),
        }));
    }, [nodes, executionLevels]);

    // Build adjacency map for highlighting dependencies
    const adjacencyMap = useMemo(() => {
        const map: Record<string, { deps: Set<string>; dependents: Set<string> }> = {};
        nodes.forEach((n) => {
            map[n.id] = { deps: new Set(), dependents: new Set() };
        });
        edges.forEach((e) => {
            if (map[e.target]) map[e.target].deps.add(e.source);
            if (map[e.source]) map[e.source].dependents.add(e.target);
        });
        return map;
    }, [nodes, edges]);

    const isRelatedToSelected = (nodeId: string) => {
        if (!selectedTaskId) return false;
        if (nodeId === selectedTaskId) return true;
        const adj = adjacencyMap[selectedTaskId];
        return adj?.deps.has(nodeId) || adj?.dependents.has(nodeId);
    };

    return (
        <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-purple-400" />
                    <h3 className="text-sm font-medium text-white">Dependency Graph</h3>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-400">{nodes.length} tasks</span>
                    <span className="text-slate-400">{edges.length} dependencies</span>
                    {hasCycles && (
                        <span className="flex items-center gap-1 text-red-400">
                            <AlertCircle className="h-3 w-3" />
                            Circular dependencies
                        </span>
                    )}
                </div>
            </div>

            {/* Graph visualization */}
            <div className="p-4 overflow-x-auto">
                <div className="flex gap-8 min-w-max">
                    {leveledNodes.map(({ level, nodes: levelNodes }) => (
                        <div key={level} className="flex flex-col gap-3">
                            {/* Level header */}
                            <div className="text-xs text-slate-500 text-center px-2 py-1 bg-slate-800 rounded">
                                Level {level}
                            </div>

                            {/* Tasks in this level */}
                            <div className="flex flex-col gap-2 min-w-[200px]">
                                {levelNodes.map((node) => {
                                    const colors = STATUS_COLORS[node.status] || STATUS_COLORS.TODO;
                                    const roleColor = ROLE_COLORS[node.agent_role] || 'bg-gray-500';
                                    const isSelected = node.id === selectedTaskId;
                                    const isRelated = isRelatedToSelected(node.id);

                                    return (
                                        <button
                                            key={node.id}
                                            onClick={() => onTaskClick?.(node.id)}
                                            className={`relative p-3 rounded-lg border transition-all text-left ${colors.bg
                                                } ${colors.border} ${isSelected
                                                    ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900'
                                                    : isRelated
                                                        ? 'ring-1 ring-blue-400/50'
                                                        : ''
                                                } hover:brightness-110`}
                                        >
                                            {/* Status icon */}
                                            <div className="absolute top-2 right-2">{getStatusIcon(node.status)}</div>

                                            {/* Role badge */}
                                            <div
                                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white ${roleColor} mb-2`}
                                            >
                                                {node.agent_role}
                                            </div>

                                            {/* Title */}
                                            <div className={`text-sm font-medium ${colors.text} line-clamp-2`}>
                                                {node.title}
                                            </div>

                                            {/* Priority */}
                                            <div className="text-[10px] text-slate-500 mt-1">Priority: {node.priority}</div>

                                            {/* Dependency indicators */}
                                            {adjacencyMap[node.id] && (
                                                <div className="flex gap-2 mt-2 text-[10px]">
                                                    {adjacencyMap[node.id].deps.size > 0 && (
                                                        <span className="text-orange-400">
                                                            ← {adjacencyMap[node.id].deps.size} deps
                                                        </span>
                                                    )}
                                                    {adjacencyMap[node.id].dependents.size > 0 && (
                                                        <span className="text-blue-400">
                                                            → {adjacencyMap[node.id].dependents.size} dependents
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}

                                {levelNodes.length === 0 && (
                                    <div className="text-xs text-slate-500 text-center py-4">No tasks</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="mt-6 pt-4 border-t border-slate-700">
                    <div className="flex flex-wrap gap-4 text-xs">
                        <div className="flex items-center gap-4">
                            <span className="text-slate-500">Status:</span>
                            <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span className="text-slate-400">Todo</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Play className="h-3 w-3 text-blue-400" />
                                <span className="text-blue-400">Running</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Pause className="h-3 w-3 text-purple-400" />
                                <span className="text-purple-400">Review</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Check className="h-3 w-3 text-green-400" />
                                <span className="text-green-400">Done</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <AlertCircle className="h-3 w-3 text-red-400" />
                                <span className="text-red-400">Failed</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-slate-500">Roles:</span>
                            {Object.entries(ROLE_COLORS).map(([role, color]) => (
                                <span key={role} className={`${color} text-white px-1.5 py-0.5 rounded text-[10px]`}>
                                    {role}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DependencyGraph;
