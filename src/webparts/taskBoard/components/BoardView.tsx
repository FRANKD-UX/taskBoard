// BoardView.tsx
import * as React from 'react';
import { useEffect, useState } from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';

import type { Task, TaskStatus } from './TaskTypes';
import { THEME } from './theme';

export interface IBoardViewProps {
  tasks: Task[];
  statuses: TaskStatus[];
  onTaskClick: (task: Task) => void;
  onNewTask: (status: TaskStatus) => void;
}

const boardStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  overflowX: 'auto',
  padding: '12px 8px 16px 8px',
  scrollBehavior: 'smooth',
  backgroundColor: THEME.colors.background,
  // Ensure the board is the positioning reference for the drag preview
  position: 'relative',
};

const columnStyle: React.CSSProperties = {
  width: 'clamp(248px, 24vw, 320px)',
  flex: '1 1 clamp(248px, 24vw, 320px)',
  minWidth: '248px',
  maxWidth: '320px',
  flexShrink: 0,
};

const getInitials = (name: string): string =>
  name
    .split(' ')
    .filter((p) => p.length > 0)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

const AVATAR_PALETTE = ['#2563eb', '#7c3aed', '#0ea5e9', '#f59e0b', '#22c55e', '#ec4899', '#14b8a6'];

const getAvatarColor = (name: string): string => {
  if (!name) return '#64748b';
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};

const getPriorityColor = (priority: Task['priority']): string => {
  return THEME.priorityColors[priority] || '#6b7280';
};

const getStatusColor = (status: TaskStatus): string => {
  return THEME.statusColors[status] || '#6b7280';
};

const formatDisplayDate = (value?: string): string => {
  if (!value) return 'No date';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? 'No date' : parsed.toISOString().split('T')[0];
};

const groupTasksByStatus = (tasks: Task[], statuses: TaskStatus[]): Record<TaskStatus, Task[]> => {
  const grouped = statuses.reduce<Record<TaskStatus, Task[]>>((acc, s) => {
    acc[s] = [];
    return acc;
  }, {} as Record<TaskStatus, Task[]>);
  tasks.forEach((task) => {
    if (statuses.indexOf(task.status) > -1) {
      grouped[task.status].push(task);
    } else {
      grouped.Unassigned.push(task);
    }
  });
  return grouped;
};

const BoardView: React.FC<IBoardViewProps> = ({
  tasks,
  statuses,
  onTaskClick,
  onNewTask,
}): React.ReactElement => {
  const tasksByStatus = groupTasksByStatus(tasks, statuses);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<TaskStatus | null>(null);
  const [enteringTaskIds, setEnteringTaskIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (Object.keys(enteringTaskIds).length === 0) return;
    const frame = requestAnimationFrame(() => setEnteringTaskIds({}));
    return () => cancelAnimationFrame(frame);
  }, [enteringTaskIds]);

  return (
    <div style={{ width: '100%', backgroundColor: THEME.colors.background }}>
      <div style={boardStyle}>
        {statuses.map((status) => (
          <Droppable key={status} droppableId={status}>
            {(dropProvided, dropSnapshot) => {
              // Remove transition during drag to prevent column shifting
              const columnTransition = dropSnapshot.isDraggingOver
                ? 'none'
                : 'background-color 160ms ease, box-shadow 160ms ease';

              const isEmpty = tasksByStatus[status].length === 0;

              return (
                <div
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                  onMouseEnter={() => setHoveredColumn(status)}
                  onMouseLeave={() => setHoveredColumn(null)}
                  style={{
                    ...columnStyle,
                    backgroundColor: dropSnapshot.isDraggingOver
                      ? '#e2e8f0'
                      : hoveredColumn === status
                      ? '#f1f5f9'
                      : THEME.colors.panel,
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    minHeight: '300px',
                    boxShadow: dropSnapshot.isDraggingOver
                      ? 'inset 0 0 0 1px rgba(59,130,246,0.3)'
                      : '0 1px 3px rgba(0,0,0,0.05)',
                    transition: columnTransition,
                  }}
                >
                  <div
                    style={{
                      height: '6px',
                      borderRadius: '999px',
                      backgroundColor: getStatusColor(status),
                      marginBottom: '2px',
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: THEME.colors.textPrimary,
                      }}
                    >
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
                        {tasksByStatus[status].length}
                      </span>
                      <button
                        type="button"
                        onClick={() => onNewTask(status)}
                        aria-label={`New task in ${status}`}
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

                  {/* Task list container with stable height */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {isEmpty && (
                      <div style={{ color: THEME.colors.textSecondary, fontSize: '12px', padding: '8px 2px' }}>
                        No tasks yet
                      </div>
                    )}

                    {tasksByStatus[status].map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(dragProvided, dragSnapshot) => {
                          const isEntering = Boolean(enteringTaskIds[task.id]);
                          const baseStyle = dragProvided.draggableProps.style as React.CSSProperties;

                          // CRITICAL: Force no transition on transform while dragging
                          const dragStyle: React.CSSProperties = dragSnapshot.isDragging
                            ? {
                                ...baseStyle,
                                transition: 'none',
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
                                boxShadow:
                                  '0 10px 20px rgba(0,0,0,0.15),0 0 0 1px rgba(59,130,246,0.5)',
                                transform: baseStyle.transform,
                              }
                            : {
                                ...baseStyle,
                                backgroundColor: THEME.colors.panel,
                                borderRadius: '10px',
                                padding: '14px',
                                borderLeft: `4px solid ${getStatusColor(status)}`,
                                border: '1px solid #e2e8f0',
                                color: THEME.colors.textPrimary,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                cursor: 'default',
                                opacity: isEntering ? 0 : 1,
                                userSelect: 'none',
                                boxShadow:
                                  hoveredTaskId === task.id
                                    ? '0 10px 20px rgba(0,0,0,0.1),0 0 0 1px rgba(59,130,246,0.3)'
                                    : '0 2px 6px rgba(0,0,0,0.05)',
                                transition: baseStyle?.transition
                                  ? `${baseStyle.transition}, box-shadow 160ms ease, opacity 180ms ease`
                                  : 'box-shadow 160ms ease, opacity 180ms ease',
                              };

                          const assigneeName = task.assignedTo || 'Unassigned';

                          return (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              style={dragStyle}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div
                                  {...dragProvided.dragHandleProps}
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
                                  ☰
                                </div>

                                <div
                                  onClick={() => onTaskClick(task)}
                                  onMouseEnter={() => setHoveredTaskId(task.id)}
                                  onMouseLeave={() => setHoveredTaskId(null)}
                                  style={{
                                    flex: 1,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <div style={{ fontWeight: 700 }}>{task.title || 'New Task'}</div>
                                  <span
                                    style={{
                                      backgroundColor: getStatusColor(status),
                                      color: '#ffffff',
                                      borderRadius: '999px',
                                      padding: '2px 8px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {status}
                                  </span>
                                </div>
                              </div>

                              <div
                                onClick={() => onTaskClick(task)}
                                onMouseEnter={() => setHoveredTaskId(task.id)}
                                onMouseLeave={() => setHoveredTaskId(null)}
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

                              <div
                                onClick={() => onTaskClick(task)}
                                onMouseEnter={() => setHoveredTaskId(task.id)}
                                onMouseLeave={() => setHoveredTaskId(null)}
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
                            </div>
                          );
                        }}
                      </Draggable>
                    ))}

                    {/* Placeholder is always present but hidden when not needed.
                        This prevents layout shifts when dragging into an empty column. */}
                    <div
                      style={{
                        display: dropSnapshot.isDraggingOver && isEmpty ? 'block' : 'none',
                        minHeight: '80px',
                        width: '100%',
                      }}
                    >
                      {dropProvided.placeholder}
                    </div>
                    {!isEmpty && dropProvided.placeholder}
                  </div>
                </div>
              );
            }}
          </Droppable>
        ))}
      </div>
    </div>
  );
};

export default BoardView;