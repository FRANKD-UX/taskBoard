import * as React from 'react';
import { useEffect, useState } from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';

import type { Task, TaskStatus } from './TaskTypes';

export interface IBoardViewProps {
  tasks: Task[];
  statuses: TaskStatus[];
  onTaskClick: (taskId: string) => void;
  createTask: (task: Task) => Promise<Task | null>;
}

const boardStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  overflowX: 'auto',
  padding: '12px 8px 16px 8px',
  scrollBehavior: 'smooth'
};

const columnStyle: React.CSSProperties = {
  width: 'clamp(248px, 24vw, 320px)',
  flex: '1 1 clamp(248px, 24vw, 320px)',
  minWidth: '248px',
  maxWidth: '320px',
  flexShrink: 0
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

const avatarPalette: string[] = ['#2563eb', '#7c3aed', '#0ea5e9', '#f59e0b', '#22c55e', '#ec4899', '#14b8a6'];

const getAvatarColor = (name: string): string => {
  if (!name) {
    return '#64748b';
  }

  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarPalette[hash % avatarPalette.length];
};

const getPriorityColor = (priority: Task['priority']): string => {
  switch (priority) {
    case 'High':
      return '#ef4444';
    case 'Medium':
      return '#f59e0b';
    case 'Low':
      return '#22c55e';
    default:
      return '#6b7280';
  }
};

const getStatusColor = (status: TaskStatus): string => {
  switch (status) {
    case 'Unassigned':
      return '#6b7280';
    case 'Backlog':
      return '#7c3aed';
    case 'ThisWeek':
      return '#0ea5e9';
    case 'InProgress':
      return '#f59e0b';
    case 'Completed':
      return '#22c55e';
    default:
      return '#6b7280';
  }
};

const groupTasksByStatus = (tasks: Task[], statuses: TaskStatus[]): Record<TaskStatus, Task[]> => {
  const grouped = statuses.reduce<Record<TaskStatus, Task[]>>((acc, status) => {
    acc[status] = [];
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

const BoardView: React.FC<IBoardViewProps> = ({ tasks, statuses, onTaskClick, createTask }): React.ReactElement => {
  const tasksByStatus = groupTasksByStatus(tasks, statuses);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<TaskStatus | null>(null);
  const [enteringTaskIds, setEnteringTaskIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (Object.keys(enteringTaskIds).length === 0) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      setEnteringTaskIds({});
    });

    return () => cancelAnimationFrame(frame);
  }, [enteringTaskIds]);

const updateTask = async (id: string, updates: Partial<Task>): Promise<void> => {
  try {
    const service = new TaskService();

    const safeUpdates: Partial<Task> = { ...updates };

    // 🔐 Enforce permissions
    if (!canAssign && safeUpdates.assignedTo !== undefined) {
      delete safeUpdates.assignedTo;
    }

    if (!canAssign && safeUpdates.assignedToId !== undefined) {
      delete safeUpdates.assignedToId;
    }

    // Persist to SharePoint
    await service.updateTask(Number(id), {
      title: safeUpdates.title,
      status: safeUpdates.status,
      priority: safeUpdates.priority,
      assignedToId: safeUpdates.assignedToId,
      dueDate: safeUpdates.dueDate,
      description: safeUpdates.description,
      requestType: safeUpdates.requestType,
      department: safeUpdates.department
    });

    //Then update UI
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === id ? { ...task, ...safeUpdates } : task
      )
    );

  } catch (error) {
    console.error("UPDATE TASK FAILED:", error);
  }
  }; else {
    console.error('Task creation failed');
     }
     console.log("Calling createTask...");
     console.log("Create result:", created);
};

  return (
    <div style={{ width: '100%', backgroundColor: '#171c33' }}>
      <div style={boardStyle}>
        {statuses.map((status) => (
          <Droppable key={status} droppableId={status}>
            {(dropProvided, dropSnapshot) => (
              <div
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
                onMouseEnter={() => setHoveredColumn(status)}
                onMouseLeave={() => setHoveredColumn(null)}
                style={{
                  ...columnStyle,
                  backgroundColor: dropSnapshot.isDraggingOver ? '#3a4161' : hoveredColumn === status ? '#343a59' : '#2c2f4a',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  minHeight: '300px',
                  boxShadow: dropSnapshot.isDraggingOver ? 'inset 0 0 0 1px rgba(59, 130, 246, 0.5)' : 'none',
                  transition: 'background-color 160ms ease, box-shadow 160ms ease'
                }}
              >
                <div style={{ height: '6px', borderRadius: '999px', backgroundColor: getStatusColor(status) }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(status),
                        display: 'inline-block'
                      }}
                    />
                    <span>{status}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        color: '#e2e8f0',
                        backgroundColor: '#1f2a44',
                        border: '1px solid #475569',
                        borderRadius: '999px',
                        padding: '2px 8px',
                        fontSize: '12px'
                      }}
                    >
                      {tasksByStatus[status].length}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddTask(status)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '999px',
                        border: '1px solid #475569',
                        backgroundColor: '#1f2a44',
                        color: '#e2e8f0',
                        cursor: 'pointer',
                        lineHeight: 1
                      }}
                      aria-label={`Add task to ${status}`}
                    >
                      +
                    </button>
                  </div>
                </div>

                {tasksByStatus[status].length === 0 && (
                  <div style={{ color: '#94a3b8', fontSize: '12px', padding: '8px 2px' }}>No tasks yet</div>
                )}

                {tasksByStatus[status].map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(dragProvided, dragSnapshot) => {
                      const isEntering = Boolean(enteringTaskIds[task.id]);
                      const dragStyle = (dragProvided.draggableProps.style || {}) as React.CSSProperties;
                      const baseTransform = typeof dragStyle.transform === 'string' ? dragStyle.transform : '';

                      let transform = baseTransform;
                      if (dragSnapshot.isDragging) {
                        transform = `${baseTransform} rotate(2deg) scale(1.03)`;
                      } else if (hoveredTaskId === task.id) {
                        transform = 'scale(1.01)';
                      } else if (isEntering) {
                        transform = 'scale(0.97) translateY(6px)';
                      }

                      const assigneeName = task.assignedTo || 'Unassigned';

                      return (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          onClick={() => onTaskClick(task.id)}
                          onMouseEnter={() => setHoveredTaskId(task.id)}
                          onMouseLeave={() => setHoveredTaskId(null)}
                          style={{
                            backgroundColor: '#1f2a44',
                            borderRadius: '10px',
                            padding: '14px',
                            borderLeft: `4px solid ${getStatusColor(status)}`,
                            border: '1px solid rgba(148, 163, 184, 0.25)',
                            color: '#f8fafc',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            cursor: 'pointer',
                            backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))',
                            transform: transform || 'scale(1)',
                            opacity: isEntering ? 0 : 1,
                            boxShadow:
                              dragSnapshot.isDragging || hoveredTaskId === task.id
                                ? '0 10px 20px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(59, 130, 246, 0.2)'
                                : '0 2px 6px rgba(0, 0, 0, 0.2)',
                            transition: `${typeof dragStyle.transition === 'string' ? dragStyle.transition : 'transform 180ms ease'}, box-shadow 160ms ease, opacity 180ms ease`,
                            ...dragStyle
                          }}
                        >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <div style={{ fontWeight: 700 }}>{task.title}</div>
                          <span
                            style={{
                              backgroundColor: getStatusColor(status),
                              color: '#f8fafc',
                              borderRadius: '999px',
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: 600
                            }}
                          >
                            {status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '12px' }}>
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              backgroundColor: getAvatarColor(assigneeName),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#e2e8f0',
                              fontWeight: 600
                            }}
                          >
                            {getInitials(assigneeName)}
                          </div>
                          <span>{task.assignedTo || 'Unassigned'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <span style={{ color: '#94a3b8' }}>📅 {task.dueDate || 'No date'}</span>
                          <span
                            style={{
                              backgroundColor: getPriorityColor(task.priority),
                              color: '#0f172a',
                              borderRadius: '999px',
                              padding: '2px 8px',
                              fontWeight: 600
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
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </div>
  );
};

export default BoardView;
