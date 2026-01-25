import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, TaskStatus } from '@/api/tasks';
import { useTasks, useMoveTask } from '@/hooks/useTasks';
import { TaskCard } from './TaskCard';
import { CheckCircle2, Circle, Clock, Sparkles } from 'lucide-react';

interface KanbanBoardProps {
    projectId: string;
    onTaskClick?: (taskId: string) => void;
}

const COLUMNS: { id: TaskStatus; title: string; icon: any; color: string }[] = [
    { id: 'TODO', title: 'To Do', icon: Circle, color: 'text-[--color-text-tertiary]' },
    { id: 'IN_PROGRESS', title: 'In Progress', icon: Clock, color: 'text-[--color-accent-secondary]' },
    { id: 'IN_REVIEW', title: 'In Review', icon: Sparkles, color: 'text-[--color-accent-info]' },
    { id: 'DONE', title: 'Done', icon: CheckCircle2, color: 'text-[--color-accent-success]' },
];

export const KanbanBoard = ({ projectId, onTaskClick }: KanbanBoardProps) => {
    const { data: tasks, isLoading } = useTasks(projectId);
    const moveTask = useMoveTask();
    const queryClient = useQueryClient();
    const [activeId, setActiveId] = useState<string | null>(null);

    // Local state for optimistic updates
    const [items, setItems] = useState<Record<TaskStatus, Task[]>>({
        TODO: [],
        IN_PROGRESS: [],
        IN_REVIEW: [],
        DONE: [],
    });

    useEffect(() => {
        if (tasks) {
            const newItems: Record<TaskStatus, Task[]> = {
                TODO: [],
                IN_PROGRESS: [],
                IN_REVIEW: [],
                DONE: [],
            };

            tasks.forEach(task => {
                if (newItems[task.status]) {
                    newItems[task.status].push(task);
                }
            });

            // Sort by priority within columns
            Object.keys(newItems).forEach(key => {
                newItems[key as TaskStatus].sort((a, b) => b.priority - a.priority);
            });

            setItems(newItems);
        }
    }, [tasks]);

    // WebSocket integration for real-time updates
    useWebSocket(projectId, {
        onMessage: (message) => {
            if (message.type === 'task_update') {
                queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
            }
        },
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const findContainer = (id: string): TaskStatus | undefined => {
        if (id in items) return id as TaskStatus;

        return Object.keys(items).find((key) =>
            items[key as TaskStatus].find((item) => item.id === id)
        ) as TaskStatus | undefined;
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        const overId = over?.id;

        if (!overId || active.id === overId) return;

        const activeContainer = findContainer(active.id as string);
        const overContainer = findContainer(overId as string) || (overId as TaskStatus);

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return;
        }

        setItems((prev) => {
            const activeItems = prev[activeContainer];
            const overItems = prev[overContainer];
            const activeIndex = activeItems.findIndex((item) => item.id === active.id);

            let newIndex;
            if (overId in prev) {
                newIndex = overItems.length + 1;
            } else {
                const isBelowOverItem =
                    over &&
                    active.rect.current.translated &&
                    active.rect.current.translated.top > over.rect.top + over.rect.height;

                const modifier = isBelowOverItem ? 1 : 0;
                newIndex = overItems.findIndex((item) => item.id === overId) + modifier;
            }

            return {
                ...prev,
                [activeContainer]: [
                    ...prev[activeContainer].filter((item) => item.id !== active.id),
                ],
                [overContainer]: [
                    ...prev[overContainer].slice(0, newIndex),
                    activeItems[activeIndex],
                    ...prev[overContainer].slice(newIndex, prev[overContainer].length),
                ],
            };
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const activeContainer = findContainer(active.id as string);
        const overContainer = over ? (findContainer(over.id as string) || (over.id as TaskStatus)) : null;

        if (activeContainer && overContainer && activeContainer !== overContainer) {
            moveTask.mutate({
                id: active.id as string,
                status: overContainer
            });
        }

        setActiveId(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center space-y-4">
                    <div className="spinner h-12 w-12 mx-auto"></div>
                    <p className="text-[--color-text-secondary] font-medium">Loading tasks...</p>
                </div>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full overflow-x-auto pb-6 gap-6 scrollbar-thin">
                {COLUMNS.map((column, index) => (
                    <div
                        key={column.id}
                        className="flex-shrink-0 w-80 animate-slide-up"
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <div className="card h-full flex flex-col">
                            {/* Column Header */}
                            <div className="flex items-center justify-between p-5 border-b border-[--color-border]">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-[--radius-md] bg-[--color-surface-hover] flex items-center justify-center ${column.color}`}>
                                        <column.icon className="h-5 w-5" strokeWidth={2.5} />
                                    </div>
                                    <h3 className="font-bold text-[--color-text-primary]">
                                        {column.title}
                                    </h3>
                                </div>
                                <span className="badge-secondary font-bold">
                                    {items[column.id].length}
                                </span>
                            </div>

                            {/* Tasks Container */}
                            <SortableContext
                                items={items[column.id].map(t => t.id)}
                                strategy={verticalListSortingStrategy}
                                id={column.id}
                            >
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] scrollbar-thin">
                                    {items[column.id].length === 0 ? (
                                        <div className="flex items-center justify-center h-32 border-2 border-dashed border-[--color-border] rounded-[--radius-lg] text-[--color-text-tertiary]">
                                            <p className="text-sm font-medium">No tasks</p>
                                        </div>
                                    ) : (
                                        items[column.id].map((task) => (
                                            <TaskCard
                                                key={task.id}
                                                task={task}
                                                onClick={() => onTaskClick?.(task.id)}
                                            />
                                        ))
                                    )}
                                </div>
                            </SortableContext>
                        </div>
                    </div>
                ))}
            </div>

            <DragOverlay>
                {activeId ? (
                    <div className="opacity-80 rotate-3 scale-105">
                        <TaskCard task={tasks?.find((t) => t.id === activeId) as Task} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
