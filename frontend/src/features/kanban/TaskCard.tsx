import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/api/tasks';
import { Bot, Clock, AlertCircle } from 'lucide-react';

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

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-md transition-all mb-3"
        >
            <div className="flex justify-between items-start mb-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(task.agent_role)}`}>
                    {task.agent_role}
                </span>
                <div className={`flex items-center ${priorityColor}`}>
                    <AlertCircle size={14} className="mr-1" />
                    <span className="text-xs font-medium">{task.priority}</span>
                </div>
            </div>

            <h4 className="text-sm font-medium text-gray-900 mb-1">{task.title}</h4>

            {task.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{task.description}</p>
            )}

            <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center">
                    <Bot size={14} className="mr-1" />
                    <span>{task.attempt_count} attempts</span>
                </div>
                <div className="flex items-center">
                    <Clock size={14} className="mr-1" />
                    <span>{new Date(task.updated_at).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    );
};
