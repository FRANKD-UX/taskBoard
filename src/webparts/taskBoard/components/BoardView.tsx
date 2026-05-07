// BoardView.tsx
//
// MIGRATION NOTES (react-beautiful-dnd -> dnd-kit):
//
//   1. DragDropContext   -> DndContext         (top-level drag orchestrator)
//   2. Droppable         -> useDroppable       (column drop zones)
//   3. Draggable         -> useDraggable       (individual task cards)
//   4. ReactDOM.createPortal workaround REMOVED – dnd-kit does not fight
//      SharePoint's scroll containers so the portal hack is no longer needed.
//   5. isDragging state  -> activeId state     (tracked at DndContext level,
//      passed down via prop so each card knows whether IT is being dragged)
//   6. onDragEnd         -> handleDragEnd      (same optimistic-update pattern,
//      new event shape: { active, over } instead of result.draggableId etc.)

import * as React from 'react';
import { useEffect, useState } from 'react';

import {
    DndContext,
    DragEndEvent,
    DragStartEvent,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';

import type {
    IncidentSeverity,
    Task,
    TaskStatus,
    WorkItemStatus,
    WorkItemType,
} from './TaskTypes';
import { THEME } from './theme';

// ---------- PUBLIC INTERFACE ----------

export interface IBoardViewProps {
    tasks: Task[];
    statuses: WorkItemStatus[];
    type: WorkItemType;
    onTaskClick: (task: Task) => void;
    onNewTask: (status: WorkItemStatus, type: WorkItemType) => void;

    /**
     * Called when the user drops a card onto a different column.
     * The parent is responsible for persisting the status change via TaskService.
     * BoardView handles the optimistic UI update internally.
     */
    onTaskStatusChange: (taskId: string, newStatus: WorkItemStatus) => void;
}

// ---------- STYLES ----------

const boardOuterStyle: React.CSSProperties = {
    height: 'calc(100vh - 200px)',
    overflow: 'hidden',
    backgroundColor: THEME.colors.background,
    display: 'flex',
    flexDirection: 'column',
};

const boardColumnsRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '16px',
    padding: '12px 8px 16px 8px',
    height: '100%',
    overflow: 'hidden',
};

const columnBaseStyle: React.CSSProperties = {
    flex: '1 1 0',
    minWidth: '200px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    borderRadius: '12px',
    padding: '12px',
    backgroundColor: THEME.colors.panel,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    boxSizing: 'border-box',
};

// ---------- AVATAR / COLOR HELPERS ----------

const AVATAR_PALETTE = ['#2563eb', '#7c3aed', '#0ea5e9', '#f59e0b', '#22c55e', '#ec4899', '#14b8a6'];

const getInitials = (name: string): string =>
    name
        .split(' ')
        .filter((part) => part.length > 0)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('');

const getAvatarColor = (name: string): string => {
    if (!name) return '#64748b';
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};

const getPriorityColor = (priority: Task['priority']): string =>
    THEME.priorityColors[priority] || '#6b7280';

const getStatusColor = (status: WorkItemStatus): string =>
    THEME.statusColors[status] || '#6b7280';

const getSeverityColor = (severity?: IncidentSeverity): string => {
    if (!severity) return THEME.colors.border;
    return THEME.severityColors[severity];
};

const getSlaLabel = (severity?: IncidentSeverity): string | null => {
    if (severity === 'P1') return 'Critical';
    if (severity === 'P2') return 'High';
    return null;
};

const formatDisplayDate = (value?: string): string => {
    if (!value) return 'No date';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? 'No date' : parsed.toISOString().split('T')[0];
};

// ---------- SLA HELPERS ----------

const AT_RISK_REMAINING_HOURS = 1;

const getSlaStatusColor = (status: string): string => {
    switch (status) {
        case 'OnTrack':  return '#22c55e';
        case 'AtRisk':   return '#f59e0b';
        case 'Breached': return '#ef4444';
        case 'Resolved': return '#3b82f6';
        default:         return '#6b7280';
    }
};

const computeSlaStatus = (
    resolutionDueDate?: string,
    storedSlaStatus?: string
): string | undefined => {
    if (resolutionDueDate) {
        const deadline = new Date(resolutionDueDate).getTime();
        if (isNaN(deadline)) return storedSlaStatus;
        const now = Date.now();
        if (now > deadline) return 'Breached';
        if (deadline - now <= AT_RISK_REMAINING_HOURS * 60 * 60 * 1000) return 'AtRisk';
        return 'OnTrack';
    }
    return storedSlaStatus;
};

const formatCountdown = (ms: number): string => {
    if (ms <= 0) return 'Overdue';
    const totalSeconds = Math.floor(ms / 1000);
    const hours   = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0)   return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
};

const getRemainingTime = (resolutionDueDate?: string): string | null => {
    if (!resolutionDueDate) return null;
    const deadline = new Date(resolutionDueDate).getTime();
    if (isNaN(deadline)) return null;
    return formatCountdown(deadline - Date.now());
};

const formatResolutionHours = (minutes?: number): string | null => {
    if (minutes === undefined || minutes === null || minutes <= 0) return null;
    const hours = minutes / 60;
    const display = hours % 1 === 0 ? hours.toString() : hours.toFixed(1);
    return `${display}h`;
};

// ---------- GROUPING LOGIC ----------

const groupTasksByStatus = (
    tasks: Task[],
    statuses: WorkItemStatus[]
): Record<string, Task[]> => {
    // Pre-populate every status bucket so empty columns still render
    const grouped = statuses.reduce<Record<string, Task[]>>((acc, status) => {
        acc[status] = [];
        return acc;
    }, {});

    tasks.forEach((task) => {
        if (statuses.indexOf(task.status) > -1) {
            grouped[task.status].push(task);
        } else if (statuses.length > 0) {
            // Fallback: orphaned tasks land in the first column
            grouped[statuses[0]].push(task);
        }
    });

    return grouped;
};

// ---------- DROPPABLE COLUMN ----------
//
// useDroppable gives us a ref we attach to the column div.
// dnd-kit will fire collision detection against all registered droppables
// and give us `isOver` so we can style the active drop target ourselves.
// We are in full control – no render-prop wrapper fighting the scroll container.

interface DroppableColumnProps {
    status: WorkItemStatus;
    type: WorkItemType;
    tasks: Task[];
    activeTaskId: string | null;
    hoveredColumn: string | null;
    hoveredTaskId: string | null;
    onNewTask: (status: WorkItemStatus, type: WorkItemType) => void;
    onTaskClick: (task: Task) => void;
    onColumnHover: (status: string | null) => void;
    onTaskHover: (taskId: string | null) => void;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({
    status,
    type,
    tasks,
    activeTaskId,
    hoveredColumn,
    hoveredTaskId,
    onNewTask,
    onTaskClick,
    onColumnHover,
    onTaskHover,
}) => {
    const { setNodeRef, isOver } = useDroppable({ id: status });

    const isEmpty = tasks.length === 0;

    const columnStyle: React.CSSProperties = {
        ...columnBaseStyle,
        backgroundColor: isOver
            ? '#e2e8f0'
            : hoveredColumn === status
            ? '#f1f5f9'
            : THEME.colors.panel,
        boxShadow: isOver
            ? 'inset 0 0 0 1px rgba(59,130,246,0.3)'
            : '0 1px 3px rgba(0,0,0,0.05)',
        transition: isOver
            ? 'none'
            : 'background-color 160ms ease, box-shadow 160ms ease',
    };

    return (
        <div
            ref={setNodeRef}
            style={columnStyle}
            onMouseEnter={() => onColumnHover(status)}
            onMouseLeave={() => onColumnHover(null)}
        >
            {/* Colour accent bar at the top of the column */}
            <div
                style={{
                    height: '6px',
                    borderRadius: '999px',
                    backgroundColor: getStatusColor(status),
                    marginBottom: '2px',
                }}
            />

            {/* Column header: dot + label + count + add button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: THEME.colors.textPrimary }}>
                    <span
                        style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: getStatusColor(status),
                            display: 'inline-block',
                        }}
                    />
                    <span>{status}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                        style={{
                            color: THEME.colors.textPrimary,
                            backgroundColor: THEME.colors.panel,
                            border: `1px solid ${THEME.colors.border}`,
                            borderRadius: '999px',
                            padding: '2px 8px',
                            fontSize: '12px',
                        }}
                    >
                        {tasks.length}
                    </span>
                    <button
                        type="button"
                        onClick={() => onNewTask(status, type)}
                        aria-label={`New ${type} in ${status}`}
                        style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '999px',
                            border: `1px solid ${THEME.colors.border}`,
                            backgroundColor: THEME.colors.panel,
                            color: THEME.colors.textPrimary,
                            cursor: 'pointer',
                            lineHeight: 1,
                            fontSize: '16px',
                        }}
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Card list */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {isEmpty && (
                    <div
                        style={{
                            color: THEME.colors.textSecondary,
                            fontSize: '12px',
                            padding: '8px 2px',
                        }}
                    >
                        No {type === 'incident' ? 'incidents' : 'tasks'} yet
                    </div>
                )}

                {tasks.map((task) => (
                    <DraggableCard
                        key={task.id}
                        task={task}
                        type={type}
                        status={status}
                        isBeingDragged={activeTaskId === task.id}
                        isHovered={hoveredTaskId === task.id}
                        onTaskClick={onTaskClick}
                        onTaskHover={onTaskHover}
                    />
                ))}
            </div>
        </div>
    );
};

// ---------- DRAGGABLE CARD ----------
//
// useDraggable gives us:
//   setNodeRef  – attach to the card's root element
//   listeners   – pointer/keyboard events that activate the drag
//   attributes  – ARIA attributes for accessibility
//   transform   – { x, y } pixel offset while dragging (null when not dragging)
//
// We apply transform as a CSS translate so the card moves with the cursor.
// dnd-kit does NOT move the card in the DOM – we control layout entirely.
// That is why it cooperates with SharePoint's scroll containers.

interface DraggableCardProps {
    task: Task;
    type: WorkItemType;
    status: WorkItemStatus;
    isBeingDragged: boolean;
    isHovered: boolean;
    onTaskClick: (task: Task) => void;
    onTaskHover: (taskId: string | null) => void;
}

const DraggableCard: React.FC<DraggableCardProps> = ({
    task,
    type,
    status,
    isBeingDragged,
    isHovered,
    onTaskClick,
    onTaskHover,
}) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });

    const assigneeName    = task.assignedTo || 'Unassigned';
    const slaLabel        = getSlaLabel(task.severity);
    const resolutionHours = formatResolutionHours(task.slaResolutionMinutes);
    const liveStatus      = computeSlaStatus(task.resolutionDueDate, task.slaStatus);
    const remainingTime   = getRemainingTime(task.resolutionDueDate);

    // While dragging, we offset the card visually but leave its DOM slot in place.
    // This avoids the "card disappears" bug from react-beautiful-dnd fighting the
    // SharePoint scroll container.
    const draggingStyle: React.CSSProperties = {
        position: 'relative',
        zIndex: 9999,
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        willChange: 'transform',
        userSelect: 'none',
        pointerEvents: 'none',
        backgroundColor: THEME.colors.panel,
        borderRadius: '10px',
        padding: '14px',
        borderLeft: `4px solid ${getStatusColor(status)}`,
        border: '1px solid #e2e8f0',
        color: THEME.colors.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        cursor: 'grabbing',
        opacity: 1,
        boxShadow: '0 10px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(59,130,246,0.5)',
    };

    const idleStyle: React.CSSProperties = {
        backgroundColor: THEME.colors.panel,
        borderRadius: '10px',
        padding: '14px',
        borderLeft: `4px solid ${type === 'incident' ? getSeverityColor(task.severity) : getStatusColor(status)}`,
        border: '1px solid #e2e8f0',
        color: THEME.colors.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        cursor: 'default',
        opacity: 1,
        userSelect: 'none',
        boxShadow: isHovered
            ? '0 10px 20px rgba(0,0,0,0.1), 0 0 0 1px rgba(59,130,246,0.3)'
            : '0 2px 6px rgba(0,0,0,0.05)',
        transition: 'box-shadow 160ms ease',
    };

    return (
        <div
            ref={setNodeRef}
            style={isBeingDragged ? draggingStyle : idleStyle}
        >
            {/* Drag handle + title row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/*
                    listeners go on the HANDLE, not the whole card.
                    This prevents click-to-open from being swallowed by the drag system.
                    attributes (ARIA) go on the handle too so screen readers understand it.
                */}
                <div
                    {...listeners}
                    {...attributes}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        height: '20px',
                        cursor: 'grab',
                        color: THEME.colors.textSecondary,
                        fontSize: '16px',
                        userSelect: 'none',
                        flexShrink: 0,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    :::
                </div>

                <div
                    onClick={() => onTaskClick(task)}
                    onMouseEnter={() => onTaskHover(task.id)}
                    onMouseLeave={() => onTaskHover(null)}
                    style={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                    }}
                >
                    <div style={{ fontWeight: 700 }}>
                        {task.title || 'New Item'}
                    </div>
                    <span
                        style={{
                            backgroundColor: type === 'incident'
                                ? getSeverityColor(task.severity)
                                : getStatusColor(status),
                            color: '#ffffff',
                            borderRadius: '999px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                        }}
                    >
                        {type === 'incident' ? (task.severity || 'P4') : status}
                    </span>
                </div>
            </div>

            {/* Assignee row */}
            <div
                onClick={() => onTaskClick(task)}
                onMouseEnter={() => onTaskHover(task.id)}
                onMouseLeave={() => onTaskHover(null)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: THEME.colors.textPrimary,
                    fontSize: '12px',
                    cursor: 'pointer',
                }}
            >
                <div
                    style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: getAvatarColor(assigneeName),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontWeight: 600,
                    }}
                >
                    {getInitials(assigneeName)}
                </div>
                <span>{assigneeName}</span>
            </div>

            {/* Footer: incident vs task */}
            {type === 'incident' ? (
                <div
                    onClick={() => onTaskClick(task)}
                    onMouseEnter={() => onTaskHover(task.id)}
                    onMouseLeave={() => onTaskHover(null)}
                    style={{ display: 'grid', gap: '8px', fontSize: '12px', cursor: 'pointer' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                        <span style={{ color: THEME.colors.textSecondary }}>
                            {task.affectedService || 'Service not set'}
                        </span>
                        {slaLabel && (
                            <span style={{ color: THEME.colors.textStrong, fontWeight: 700, fontSize: '11px' }}>
                                {slaLabel}
                            </span>
                        )}
                    </div>

                    <span
                        style={{
                            backgroundColor: '#f8fafc',
                            color: THEME.colors.textPrimary,
                            borderRadius: '8px',
                            padding: '8px 10px',
                            border: `1px solid ${THEME.colors.border}`,
                        }}
                    >
                        {task.impact || 'Impact details pending'}
                    </span>

                    {(liveStatus || resolutionHours || remainingTime) && (
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            {liveStatus && (
                                <span
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: '#ffffff',
                                        backgroundColor: getSlaStatusColor(liveStatus),
                                        borderRadius: '999px',
                                        padding: '1px 8px',
                                    }}
                                >
                                    {liveStatus}
                                </span>
                            )}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {remainingTime && (
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: THEME.colors.textSecondary }}>
                                        {remainingTime}
                                    </span>
                                )}
                                {resolutionHours && (
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: THEME.colors.textSecondary }}>
                                        {resolutionHours}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // Task footer: due date + priority badge
                <div
                    onClick={() => onTaskClick(task)}
                    onMouseEnter={() => onTaskHover(task.id)}
                    onMouseLeave={() => onTaskHover(null)}
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                        cursor: 'pointer',
                    }}
                >
                    <span style={{ color: THEME.colors.textSecondary }}>
                        {formatDisplayDate(task.dueDate)}
                    </span>
                    <span
                        style={{
                            backgroundColor: getPriorityColor(task.priority),
                            color: '#0f172a',
                            borderRadius: '999px',
                            padding: '2px 8px',
                            fontWeight: 600,
                        }}
                    >
                        {task.priority}
                    </span>
                </div>
            )}
        </div>
    );
};

// ---------- ROOT COMPONENT ----------

const BoardView: React.FC<IBoardViewProps> = ({
    tasks,
    statuses,
    type,
    onTaskClick,
    onNewTask,
    onTaskStatusChange,
}): React.ReactElement => {
    // activeTaskId tracks which card is currently being dragged.
    // We pass it down so DraggableCard can apply the lifted style to itself.
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

    const [hoveredTaskId,  setHoveredTaskId]  = useState<string | null>(null);
    const [hoveredColumn,  setHoveredColumn]  = useState<string | null>(null);

    // Re-render every second to keep SLA countdowns accurate.
    const [, setTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    // Group the incoming task list into per-status buckets.
    // We do this inside the render so it always reflects the latest props.
    const tasksByStatus = groupTasksByStatus(tasks, statuses);

    // PointerSensor is the standard mouse/touch sensor for dnd-kit.
    // activationConstraint delays activation by 8px so that normal clicks
    // are not accidentally treated as drags.
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        })
    );

    const handleDragStart = (event: DragStartEvent): void => {
        setActiveTaskId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent): void => {
        const { active, over } = event;

        setActiveTaskId(null);

        // If dropped outside any column, do nothing.
        if (!over) return;

        const taskId   = active.id as string;
        const newStatus = over.id as WorkItemStatus;

        // Find the task that was dragged to check its current status.
        const draggedTask = tasks.find((t) => t.id === taskId);
        if (!draggedTask) return;

        // Skip if dropped back into the same column – no change needed.
        if (draggedTask.status === newStatus) return;

        // The parent owns state and persistence (TaskService).
        // We call the callback and let the parent do the optimistic update + API call.
        onTaskStatusChange(taskId, newStatus);
    };

    return (
        /*
            DndContext is the drag orchestrator – it replaces DragDropContext.
            collisionDetection: closestCenter means dnd-kit picks the droppable
            whose centre point is closest to the dragged item's centre.
            That is the correct algorithm for a column-based Kanban board.
        */
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div style={boardOuterStyle}>
                <div style={boardColumnsRowStyle}>
                    {statuses.map((status) => (
                        <DroppableColumn
                            key={status}
                            status={status}
                            type={type}
                            tasks={tasksByStatus[status] || []}
                            activeTaskId={activeTaskId}
                            hoveredColumn={hoveredColumn}
                            hoveredTaskId={hoveredTaskId}
                            onNewTask={onNewTask}
                            onTaskClick={onTaskClick}
                            onColumnHover={setHoveredColumn}
                            onTaskHover={setHoveredTaskId}
                        />
                    ))}
                </div>
            </div>
        </DndContext>
    );
};

export default BoardView;