// TableView.tsx
import * as React from 'react';
import { useState } from 'react';

import type { Task, TaskStatus } from './TaskTypes';

interface ITableViewProps {
  tasks: Task[];
  statuses: TaskStatus[];
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  canAssign: boolean;
}

type EditableField = 'title' | 'assignedTo' | 'status' | 'priority' | 'dueDate';

interface IEditingCell {
  taskId: string;
  field: EditableField;
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  tableLayout: 'fixed',
  borderCollapse: 'collapse',
  color: '#e2e8f0',
};

const cellStyle: React.CSSProperties = {
  borderBottom: '1px solid #334155',
  borderRight: '1px solid #334155',
  padding: '10px 12px',
  textAlign: 'left',
};

const headerCellStyle: React.CSSProperties = {
  ...cellStyle,
  position: 'sticky',
  top: 0,
  zIndex: 2,
  backgroundColor: '#25344f',
  color: '#f8fafc',
  fontWeight: 700,
  borderBottom: '2px solid #475569',
};

const columnWidths: Record<'title' | 'assignedTo' | 'status' | 'priority' | 'dueDate' | 'timeline', string> = {
  title: '33%',
  assignedTo: '15%',
  status: '12%',
  priority: '10%',
  dueDate: '12%',
  timeline: '18%'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#0f172a',
  color: '#f8fafc',
  border: '1px solid #475569',
  borderRadius: '6px',
  padding: '6px 8px'
};

const singleLineTextStyle: React.CSSProperties = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: 'block'
};

const avatarPalette: string[] = ['#2563eb', '#7c3aed', '#0ea5e9', '#f59e0b', '#22c55e', '#ec4899', '#14b8a6'];

const getInitials = (name: string | undefined): string => {
  if (!name || name === 'Unassigned') return 'U';
  
  return name
    .split(' ')
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

const getAvatarColor = (name: string | undefined): string => {
  if (!name || name === 'Unassigned') {
    return '#64748b';
  }

  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarPalette[hash % avatarPalette.length];
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

const getTimelineProgress = (task: Task): number => {
  const start = new Date(task.createdAt || new Date()).getTime();
  const end = new Date(task.dueDate || new Date()).getTime();
  const now = Date.now();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return task.dueDate ? 65 : 25;
  }

  if (now <= start) {
    return 5;
  }

  if (now >= end) {
    return 100;
  }

  return Math.round(((now - start) / (end - start)) * 100);
};

const formatDateReadable = (value?: string): string => {
  if (!value) {
    return 'N/A';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateCompact = (value?: string): string => {
  if (!value) {
    return 'N/A';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
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

const TableView: React.FC<ITableViewProps> = ({ tasks, statuses, updateTask, deleteTask, canAssign }): React.ReactElement => {
  const [editingCell, setEditingCell] = useState<IEditingCell | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [focusedCell, setFocusedCell] = useState<IEditingCell | null>(null);
  const [rowDrafts, setRowDrafts] = useState<Record<string, Partial<Task>>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('All');
  const [sortDirection, setSortDirection] = useState<'None' | 'Asc' | 'Desc'>('None');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<TaskStatus, boolean>>(() =>
    statuses.reduce<Record<TaskStatus, boolean>>((acc, status) => {
      acc[status] = false;
      return acc;
    }, {} as Record<TaskStatus, boolean>)
  );

  const isEditing = (taskId: string, field: EditableField): boolean => {
    return editingCell?.taskId === taskId && editingCell?.field === field;
  };

  const getCellValue = <K extends EditableField>(task: Task, field: K): Task[K] => {
    const draftValue = rowDrafts[task.id]?.[field] as Task[K] | undefined;
    return draftValue !== undefined ? draftValue : task[field];
  };

  const startEditing = (task: Task, field: EditableField): void => {
    setEditingCell({ taskId: task.id, field });
    setRowDrafts((current) => ({
      ...current,
      [task.id]: {
        ...current[task.id],
        [field]: task[field]
      }
    }));
  };

  const handleCellChange = <K extends EditableField>(taskId: string, field: K, value: Task[K]): void => {
    setRowDrafts((current) => ({
      ...current,
      [taskId]: {
        ...current[taskId],
        [field]: value
      }
    }));
  };

  const commitCellEdit = (taskId: string, field: EditableField): void => {
    const value = rowDrafts[taskId]?.[field];

    if (value !== undefined) {
      updateTask(taskId, { [field]: value } as Partial<Task>);
    }

    setRowDrafts((current) => {
      const row = current[taskId];
      if (!row) {
        return current;
      }

      const { [field]: _removed, ...remainingFields } = row;
      if (Object.keys(remainingFields).length === 0) {
        const { [taskId]: _removedRow, ...remainingRows } = current;
        return remainingRows;
      }

      return {
        ...current,
        [taskId]: remainingFields
      };
    });

    setEditingCell(null);
    setFocusedCell(null);
  };

  const getEditorStyle = (taskId: string, field: EditableField): React.CSSProperties => {
    const isFocused = focusedCell?.taskId === taskId && focusedCell?.field === field;

    return {
      ...inputStyle,
      border: isFocused ? '1px solid #60a5fa' : inputStyle.border,
      boxShadow: isFocused ? '0 0 0 2px rgba(96, 165, 250, 0.25)' : 'none'
    };
  };

  const toggleGroup = (status: TaskStatus): void => {
    setCollapsedGroups((current) => ({
      ...current,
      [status]: !current[status]
    }));
  };

  const getTasksForStatus = (status: TaskStatus): Task[] => {
    if (status === 'Unassigned') {
      return filteredTasks.filter((task) => task.status === status || statuses.indexOf(task.status) === -1);
    }

    return filteredTasks.filter((task) => task.status === status);
  };

  const filteredTasks = tasks
    .filter((task) => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchesSearch =
        normalizedSearch.length === 0 ||
        task.title.toLowerCase().indexOf(normalizedSearch) > -1 ||
        (task.assignedTo || '').toLowerCase().indexOf(normalizedSearch) > -1;

      if (!matchesSearch) {
        return false;
      }

      if (filterValue === 'All') {
        return true;
      }

      if (statuses.indexOf(filterValue as TaskStatus) > -1) {
        return task.status === filterValue;
      }

      return task.priority === filterValue;
    })
    .sort((a, b) => {
      if (sortDirection === 'None') {
        return 0;
      }

      const left = a.title.toLowerCase();
      const right = b.title.toLowerCase();
      const comparison = left.localeCompare(right);

      return sortDirection === 'Asc' ? comparison : -comparison;
    });

  return (
    <div style={{ padding: '8px', backgroundColor: '#171c33' }}>
      <div
        style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '8px',
          padding: '8px',
          backgroundColor: '#1f2a44',
          border: '1px solid #334155',
          borderRadius: '10px'
        }}
      >
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search tasks"
          style={{ ...inputStyle, maxWidth: '260px' }}
        />

        <select value={filterValue} onChange={(event) => setFilterValue(event.target.value)} style={{ ...inputStyle, width: '200px' }}>
          <option value="All">All</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
          <option value="Low">Low Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="High">High Priority</option>
        </select>

        <button
          type="button"
          onClick={() => setSortDirection((current) => (current === 'None' ? 'Asc' : current === 'Asc' ? 'Desc' : 'None'))}
          style={{
            backgroundColor: '#25344f',
            color: '#e2e8f0',
            border: '1px solid #475569',
            borderRadius: '8px',
            padding: '7px 12px',
            cursor: 'pointer'
          }}
        >
          Sort: {sortDirection}
        </button>
      </div>

      <div
        style={{
          overflowX: 'hidden',
          overflowY: 'auto',
          scrollBehavior: 'smooth',
          maxHeight: '70vh',
          border: '1px solid #334155',
          borderRadius: '12px',
          backgroundColor: '#1f2a44',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)'
        }}
      >
        <table style={tableStyle}>
          <colgroup>
            <col style={{ width: columnWidths.title }} />
            <col style={{ width: columnWidths.assignedTo }} />
            <col style={{ width: columnWidths.status }} />
            <col style={{ width: columnWidths.priority }} />
            <col style={{ width: columnWidths.dueDate }} />
            <col style={{ width: columnWidths.timeline }} />
          </colgroup>
          <thead>
            <tr>
              <th style={headerCellStyle}>Task Name</th>
              <th style={headerCellStyle}>Assigned To</th>
              <th style={headerCellStyle}>Status</th>
              <th style={headerCellStyle}>Priority</th>
              <th style={headerCellStyle}>Due Date</th>
              <th style={{ ...headerCellStyle, borderRight: 'none' }}>Timeline</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((status, groupIndex) => {
              const groupedTasks = getTasksForStatus(status);
              const isCollapsed = Boolean(collapsedGroups[status]);

              return (
                <React.Fragment key={status}>
                  {groupIndex > 0 && (
                    <tr>
                      <td colSpan={6} style={{ height: '6px', padding: 0, border: 'none', backgroundColor: '#171c33' }} />
                    </tr>
                  )}
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        ...cellStyle,
                        borderRight: 'none',
                        borderTop: '2px solid #3b4f6f',
                        borderBottom: '1px solid #3b4f6f',
                        borderLeft: `4px solid ${getStatusColor(status)}`,
                        backgroundColor: '#1a253d',
                        padding: '10px 12px'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleGroup(status)}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          color: '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          fontWeight: 800,
                          textAlign: 'left'
                        }}
                      >
                        <span>{isCollapsed ? '▸' : '▾'} {status}</span>
                        <span
                          style={{
                            color: '#e2e8f0',
                            backgroundColor: '#1f2a44',
                            border: '1px solid #475569',
                            borderRadius: '999px',
                            padding: '2px 8px',
                            fontWeight: 700,
                            fontSize: '11px'
                          }}
                        >
                          {groupedTasks.length}
                        </span>
                      </button>
                    </td>
                  </tr>

                  {!isCollapsed &&
                    groupedTasks.map((task) => (
                      <tr
                        key={task.id}
                        onMouseEnter={() => setHoveredRowId(task.id)}
                        onMouseLeave={() => setHoveredRowId(null)}
                        style={{
                          backgroundColor: hoveredRowId === task.id ? '#2a3b5b' : '#1b2840',
                          transition: 'background-color 140ms ease'
                        }}
                      >
                        <td style={cellStyle} onClick={() => startEditing(task, 'title')}>
                          {isEditing(task.id, 'title') ? (
                            <input
                              type="text"
                              value={getCellValue(task, 'title')}
                              onChange={(event) => handleCellChange(task.id, 'title', event.target.value)}
                              onFocus={() => setFocusedCell({ taskId: task.id, field: 'title' })}
                              onBlur={() => commitCellEdit(task.id, 'title')}
                              autoFocus
                              style={getEditorStyle(task.id, 'title')}
                            />
                          ) : (
                            <span style={singleLineTextStyle}>{task.title}</span>
                          )}
                        </td>

                        <td style={cellStyle} onClick={() => canAssign && startEditing(task, 'assignedTo')}>
                          {canAssign && isEditing(task.id, 'assignedTo') ? (
                            <input
                              type="text"
                              value={getCellValue(task, 'assignedTo')}
                              onChange={(event) => handleCellChange(task.id, 'assignedTo', event.target.value)}
                              onFocus={() => setFocusedCell({ taskId: task.id, field: 'assignedTo' })}
                              onBlur={() => commitCellEdit(task.id, 'assignedTo')}
                              autoFocus
                              style={getEditorStyle(task.id, 'assignedTo')}
                            />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <span
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  backgroundColor: getAvatarColor(task.assignedTo || 'Unassigned'),
                                  color: '#e2e8f0',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11px',
                                  fontWeight: 700
                                }}
                              >
                                {getInitials(task.assignedTo || 'Unassigned')}
                              </span>
                              <span style={singleLineTextStyle}>{task.assignedTo || 'Unassigned'}</span>
                            </div>
                          )}
                        </td>

                        <td style={cellStyle} onClick={() => startEditing(task, 'status')}>
                          {isEditing(task.id, 'status') ? (
                            <select
                              value={getCellValue(task, 'status')}
                              onChange={(event) => handleCellChange(task.id, 'status', event.target.value as TaskStatus)}
                              onFocus={() => setFocusedCell({ taskId: task.id, field: 'status' })}
                              onBlur={() => commitCellEdit(task.id, 'status')}
                              autoFocus
                              style={getEditorStyle(task.id, 'status')}
                            >
                              {statuses.map((itemStatus) => (
                                <option key={itemStatus} value={itemStatus}>
                                  {itemStatus}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              style={{
                                backgroundColor: getStatusColor(task.status),
                                color: '#f8fafc',
                                borderRadius: '999px',
                                padding: '2px 10px',
                                fontSize: '11px',
                                fontWeight: 600
                              }}
                            >
                              {task.status}
                            </span>
                          )}
                        </td>

                        <td style={cellStyle} onClick={() => startEditing(task, 'priority')}>
                          {isEditing(task.id, 'priority') ? (
                            <select
                              value={getCellValue(task, 'priority')}
                              onChange={(event) => handleCellChange(task.id, 'priority', event.target.value as Task['priority'])}
                              onFocus={() => setFocusedCell({ taskId: task.id, field: 'priority' })}
                              onBlur={() => commitCellEdit(task.id, 'priority')}
                              autoFocus
                              style={getEditorStyle(task.id, 'priority')}
                            >
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                            </select>
                          ) : (
                            <span
                              style={{
                                backgroundColor: getPriorityColor(task.priority),
                                color: '#0f172a',
                                borderRadius: '999px',
                                padding: '2px 10px',
                                fontSize: '11px',
                                fontWeight: 700
                              }}
                            >
                              {task.priority}
                            </span>
                          )}
                        </td>

                        <td style={cellStyle} onClick={() => startEditing(task, 'dueDate')}>
                          {isEditing(task.id, 'dueDate') ? (
                            <input
                              type="date"
                              value={getCellValue(task, 'dueDate')}
                              onChange={(event) => handleCellChange(task.id, 'dueDate', event.target.value)}
                              onFocus={() => setFocusedCell({ taskId: task.id, field: 'dueDate' })}
                              onBlur={() => commitCellEdit(task.id, 'dueDate')}
                              autoFocus
                              style={getEditorStyle(task.id, 'dueDate')}
                            />
                          ) : (
                            <span>{formatDateReadable(task.dueDate)}</span>
                          )}
                        </td>

                        <td style={{ ...cellStyle, borderRight: 'none' }}>
                          <div style={{ display: 'grid', gap: '6px', padding: '4px 4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', minHeight: '20px' }}>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  startEditing(task, 'title');
                                }}
                                style={{
                                  backgroundColor: '#334155',
                                  color: '#f8fafc',
                                  border: 'none',
                                  borderRadius: '999px',
                                  width: '22px',
                                  height: '22px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  opacity: hoveredRowId === task.id ? 1 : 0,
                                  pointerEvents: hoveredRowId === task.id ? 'auto' : 'none',
                                  transition: 'opacity 120ms ease'
                                }}
                                aria-label="Edit task"
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  deleteTask(task.id);
                                }}
                                style={{
                                  backgroundColor: '#ef4444',
                                  color: '#f8fafc',
                                  border: 'none',
                                  borderRadius: '999px',
                                  width: '22px',
                                  height: '22px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  opacity: hoveredRowId === task.id ? 1 : 0,
                                  pointerEvents: hoveredRowId === task.id ? 'auto' : 'none',
                                  transition: 'opacity 120ms ease'
                                }}
                                aria-label="Delete task"
                              >
                                🗑
                              </button>
                            </div>
                            <div
                              style={{
                                height: '14px',
                                backgroundColor: '#111b2f',
                                borderRadius: '999px',
                                overflow: 'hidden',
                                border: '1px solid #334155',
                                padding: '1px'
                              }}
                            >
                              <div
                                style={{
                                  width: `${getTimelineProgress(task)}%`,
                                  height: '100%',
                                  background: 'linear-gradient(90deg, #0ea5e9, #22d3ee 45%, #22c55e)',
                                  borderRadius: '999px'
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '10px' }}>
                              <span>{formatDateCompact(task.createdAt)}</span>
                              <span>{formatDateCompact(task.dueDate)}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableView;
