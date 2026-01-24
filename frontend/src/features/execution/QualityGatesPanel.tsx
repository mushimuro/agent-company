import { CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { useState, ReactNode } from 'react';

interface GateResult {
    gate_type: string;
    status: 'PASSED' | 'FAILED' | 'RUNNING' | 'PENDING' | 'SKIPPED';
    output: string;
    duration_seconds?: number;
}

interface QualityGatesPanelProps {
    gateResults: GateResult[];
    isLoading?: boolean;
}

const GATE_LABELS: Record<string, string> = {
    TESTS: 'Test Suite',
    LINTING: 'Code Linting',
    TYPECHECK: 'Type Checking',
    BUILD: 'Build Check',
};

const GATE_ICONS: Record<string, ReactNode> = {
    TESTS: <span className="text-lg">🧪</span>,
    LINTING: <span className="text-lg">📝</span>,
    TYPECHECK: <span className="text-lg">📋</span>,
    BUILD: <span className="text-lg">🔨</span>,
};

export const QualityGatesPanel = ({ gateResults, isLoading }: QualityGatesPanelProps) => {
    const [expandedGates, setExpandedGates] = useState<Set<string>>(new Set());

    const toggleGate = (gateType: string) => {
        const newExpanded = new Set(expandedGates);
        if (newExpanded.has(gateType)) {
            newExpanded.delete(gateType);
        } else {
            newExpanded.add(gateType);
        }
        setExpandedGates(newExpanded);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PASSED':
                return <CheckCircle className="h-5 w-5 text-green-400" />;
            case 'FAILED':
                return <XCircle className="h-5 w-5 text-red-400" />;
            case 'RUNNING':
                return <Clock className="h-5 w-5 text-blue-400 animate-spin" />;
            case 'PENDING':
                return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
            default:
                return <AlertTriangle className="h-5 w-5 text-gray-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PASSED':
                return 'bg-green-500/10 border-green-500/30';
            case 'FAILED':
                return 'bg-red-500/10 border-red-500/30';
            case 'RUNNING':
                return 'bg-blue-500/10 border-blue-500/30';
            default:
                return 'bg-yellow-500/10 border-yellow-500/30';
        }
    };

    const overallStatus = gateResults.every((g) => g.status === 'PASSED')
        ? 'PASSED'
        : gateResults.some((g) => g.status === 'FAILED')
            ? 'FAILED'
            : gateResults.some((g) => g.status === 'RUNNING')
                ? 'RUNNING'
                : 'PENDING';

    if (isLoading) {
        return (
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
                <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-400 animate-spin" />
                    <span className="text-slate-300">Running quality gates...</span>
                </div>
            </div>
        );
    }

    if (!gateResults || gateResults.length === 0) {
        return (
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
                <div className="flex items-center gap-3 text-slate-400">
                    <AlertTriangle className="h-5 w-5" />
                    <span>No quality gate results available</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
            {/* Header */}
            <div
                className={`flex items-center justify-between px-4 py-3 border-b border-slate-700 ${overallStatus === 'PASSED'
                    ? 'bg-green-500/10'
                    : overallStatus === 'FAILED'
                        ? 'bg-red-500/10'
                        : 'bg-blue-500/10'
                    }`}
            >
                <div className="flex items-center gap-3">
                    {getStatusIcon(overallStatus)}
                    <h3 className="text-sm font-medium text-white">Quality Gates</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${overallStatus === 'PASSED'
                            ? 'bg-green-500/20 text-green-300'
                            : overallStatus === 'FAILED'
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}
                    >
                        {overallStatus === 'PASSED'
                            ? 'All Passed'
                            : overallStatus === 'FAILED'
                                ? 'Failed'
                                : 'Running'}
                    </span>
                </div>
            </div>

            {/* Gate results */}
            <div className="divide-y divide-slate-700">
                {gateResults.map((gate) => {
                    const isExpanded = expandedGates.has(gate.gate_type);
                    const label = GATE_LABELS[gate.gate_type] || gate.gate_type;
                    const icon = GATE_ICONS[gate.gate_type] || <span className="text-lg">⚙️</span>;

                    return (
                        <div key={gate.gate_type} className="bg-slate-900">
                            <button
                                onClick={() => toggleGate(gate.gate_type)}
                                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800 transition-colors ${getStatusColor(
                                    gate.status
                                )} border-l-2`}
                            >
                                <div className="flex items-center gap-3">
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-slate-400" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-slate-400" />
                                    )}
                                    {icon}
                                    <span className="text-sm text-white">{label}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {gate.duration_seconds !== undefined && (
                                        <span className="text-xs text-slate-400">
                                            {gate.duration_seconds.toFixed(1)}s
                                        </span>
                                    )}
                                    {getStatusIcon(gate.status)}
                                </div>
                            </button>

                            {isExpanded && gate.output && (
                                <div className="bg-slate-950 border-t border-slate-700 p-4">
                                    <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-60 overflow-y-auto">
                                        {gate.output}
                                    </pre>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="px-4 py-3 bg-slate-800 border-t border-slate-700">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                        {gateResults.filter((g) => g.status === 'PASSED').length} of {gateResults.length} passed
                    </span>
                    {overallStatus === 'PASSED' && (
                        <span className="text-green-400 font-medium">✨ Ready for review</span>
                    )}
                    {overallStatus === 'FAILED' && (
                        <span className="text-red-400 font-medium">⚠️ Issues need attention</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QualityGatesPanel;
