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

interface KanbanBoardProps {
    projectId: string;
    onTaskClick?: (taskId: string) => void;
}

const COLUMNS: { id: TaskStatus; title: string }[] = [
    { id: 'TODO', title: 'To Do' },
    { id: 'IN_PROGRESS', title: 'In Progress' },
    { id: 'IN_REVIEW', title: 'In Review' },
    { id: 'DONE', title: 'Done' },
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
                // Invalidate and refetch tasks when updates are received
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
            // Trigger API update
            moveTask.mutate({
                id: active.id as string,
                status: overContainer
            });
        }

        setActiveId(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
            <div className="flex h-full overflow-x-auto pb-4 gap-4">
                {COLUMNS.map((column) => (
                    <div
                        key={column.id}
                        className="flex-shrink-0 w-80 bg-gray-100 rounded-lg p-3 flex flex-col max-h-full"
                    >
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="font-semibold text-gray-700">{column.title}</h3>
                            <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
                                {items[column.id].length}
                            </span>
                        </div>

                        <SortableContext
                            items={items[column.id].map(t => t.id)}
                            strategy={verticalListSortingStrategy}
                            id={column.id}
                        >
                            <div
                                className="flex-1 overflow-y-auto min-h-[100px]"
                            // This makes the whole column droppable/sortable context
                            >
                                {items[column.id].map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onClick={() => onTaskClick?.(task.id)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </div>
                ))}
            </div>

            <DragOverlay>
                {activeId ? (
                    <TaskCard task={tasks?.find((t) => t.id === activeId) as Task} />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
