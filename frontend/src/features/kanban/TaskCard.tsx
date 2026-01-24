import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/api/tasks';
import { useExecuteTask } from '@/hooks/useTasks';
import { Bot, AlertCircle, Play, Loader2 } from 'lucide-react';

interface TaskCardProps {
    task: Task;
}

export const TaskCard = ({ task }: TaskCardProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const executeTask = useExecuteTask();

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'PM': return 'bg-purple-100 text-purple-800';
            case 'FRONTEND': return 'bg-blue-100 text-blue-800';
            case 'BACKEND': return 'bg-green-100 text-green-800';
            case 'QA': return 'bg-yellow-100 text-yellow-800';
            case 'DEVOPS': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const priorityColor = task.priority > 7 ? 'text-red-600' : task.priority > 4 ? 'text-yellow-600' : 'text-gray-400';

    const handleExecute = (e: React.MouseEvent) => {
        // Prevent drag and drop when clicking the button
        e.stopPropagation();
        executeTask.mutate(task.id);
    };

    const isRunning = task.status === 'IN_PROGRESS' || executeTask.isPending;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-lg transition-all mb-4 group ${isRunning ? 'border-blue-400 ring-2 ring-blue-50 ring-opacity-50' : ''}`}
        >
            <div className="flex justify-between items-start mb-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${getRoleColor(task.agent_role)}`}>
                    {task.agent_role}
                </span>
                <div className={`flex items-center space-x-1 ${priorityColor}`}>
                    <AlertCircle size={14} />
                    <span className="text-xs font-bold">{task.priority}</span>
                </div>
            </div>

            <h4 className="text-sm font-semibold text-gray-900 mb-2 leading-snug group-hover:text-blue-600 transition-colors">{task.title}</h4>

            {task.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">{task.description}</p>
            )}

            <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center space-x-3 text-[10px] font-medium text-gray-400">
                    <div className="flex items-center space-x-1">
                        <Bot size={12} className={task.attempt_count > 0 ? 'text-blue-500' : ''} />
                        <span>{task.attempt_count} attempts</span>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    {task.status === 'TODO' && (
                        <button
                            onClick={handleExecute}
                            disabled={isRunning}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Run Task"
                        >
                            {isRunning ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Play size={16} fill="currentColor" />
                            )}
                        </button>
                    )}
                    {task.status === 'IN_PROGRESS' && (
                        <div className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-blue-50 text-blue-600">
                            <Loader2 size={14} className="animate-spin" />
                            <span className="text-[10px] font-bold uppercase">Running</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
