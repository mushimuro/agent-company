import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/api/tasks';
import { useExecuteTask } from '@/hooks/useTasks';
import { Bot, AlertCircle, Play, Loader2, GripVertical } from 'lucide-react';

interface TaskCardProps {
    task: Task;
    onClick?: () => void;
}

export const TaskCard = ({ task, onClick }: TaskCardProps) => {
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
            case 'PM': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'FRONTEND': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'BACKEND': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'QA': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'DEVOPS': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const priorityConfig = task.priority > 7 
        ? { color: 'text-[--color-accent-error]', bg: 'bg-red-500/10', border: 'border-red-500/20' } 
        : task.priority > 4 
        ? { color: 'text-[--color-accent-secondary]', bg: 'bg-amber-500/10', border: 'border-amber-500/20' }
        : { color: 'text-[--color-text-tertiary]', bg: 'bg-gray-500/10', border: 'border-gray-500/20' };

    const handleExecute = (e: React.MouseEvent) => {
        e.stopPropagation();
        executeTask.mutate(task.id);
    };

    const isRunning = task.status === 'IN_PROGRESS' || executeTask.isPending;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            onClick={onClick}
            className={`
                card group cursor-pointer relative
                hover:border-[--color-accent-primary] hover:shadow-[--shadow-accent]
                transition-all duration-200
                ${isDragging ? 'shadow-xl scale-105 rotate-2' : ''}
                ${isRunning ? 'border-[--color-accent-primary] shadow-[--shadow-accent]' : ''}
            `}
        >
            {/* Drag Handle */}
            <div 
                {...listeners}
                className="absolute top-3 right-3 p-1.5 rounded-[--radius-sm] opacity-0 group-hover:opacity-100 hover:bg-[--color-surface-hover] transition-opacity cursor-grab active:cursor-grabbing"
            >
                <GripVertical className="h-4 w-4 text-[--color-text-tertiary]" strokeWidth={2} />
            </div>

            <div className="p-4 space-y-3">
                {/* Header: Role Badge & Priority */}
                <div className="flex items-center justify-between">
                    <span className={`
                        inline-flex items-center px-2.5 py-1 rounded-[--radius-full] 
                        text-xs font-bold uppercase tracking-wider border
                        ${getRoleColor(task.agent_role)}
                    `}>
                        {task.agent_role}
                    </span>
                    <div className={`
                        flex items-center gap-1.5 px-2.5 py-1 rounded-[--radius-full] border
                        ${priorityConfig.bg} ${priorityConfig.border} ${priorityConfig.color}
                    `}>
                        <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                        <span className="text-xs font-bold">{task.priority}</span>
                    </div>
                </div>

                {/* Task Title */}
                <h4 className="text-sm font-bold text-[--color-text-primary] leading-snug group-hover:text-[--color-accent-primary] transition-colors line-clamp-2">
                    {task.title}
                </h4>

                {/* Task Description */}
                {task.description && (
                    <p className="text-xs text-[--color-text-secondary] line-clamp-2 leading-relaxed">
                        {task.description}
                    </p>
                )}

                {/* Divider */}
                <div className="border-t border-[--color-border]"></div>

                {/* Footer: Attempts & Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-[--color-text-secondary]">
                        <Bot className={`h-4 w-4 ${task.attempt_count > 0 ? 'text-[--color-accent-primary]' : 'text-[--color-text-tertiary]'}`} strokeWidth={2} />
                        <span className="font-semibold">
                            {task.attempt_count} {task.attempt_count === 1 ? 'attempt' : 'attempts'}
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {task.status === 'TODO' && (
                            <button
                                onClick={handleExecute}
                                disabled={isRunning}
                                className="
                                    flex items-center justify-center
                                    w-8 h-8 rounded-[--radius-md]
                                    bg-[--color-accent-primary]/20 text-[--color-accent-primary]
                                    hover:bg-[--color-accent-primary] hover:text-[--color-bg-primary]
                                    hover:shadow-[--shadow-accent]
                                    transition-all duration-200 active:scale-95
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                "
                                title="Run Task"
                            >
                                {isRunning ? (
                                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                                ) : (
                                    <Play className="h-4 w-4" fill="currentColor" strokeWidth={2} />
                                )}
                            </button>
                        )}
                        {task.status === 'IN_PROGRESS' && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[--radius-full] bg-[--color-accent-primary]/20 text-[--color-accent-primary] border border-[--color-accent-primary]/30">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
                                <span className="text-xs font-bold uppercase tracking-wide">Running</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
