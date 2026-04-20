// TaskPanel.tsx
import * as React from 'react';
import { useEffect, useState, useRef } from 'react';

import type { Task, TaskPriority, TaskStatus } from './TaskTypes';
import { THEME } from './theme';
import PeoplePicker from './PeoplePicker';
import type { IResolvedUser } from './PeoplePicker';

export interface ITaskPanelProps {
  selectedTask: Task | null;
  updateTask: (id: string, updates: Partial<Task>) => void;
  saveTask: (task: Task) => Promise<Task | null>;
  deleteTask: (id: string) => void;
  onClose: () => void;
  canAssign: boolean;
  context: any;
  currentUserName: string;
}


// Styles


const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  width: '380px',
  maxWidth: '90vw',
  height: '100vh',
  backgroundColor: THEME.colors.panel,
  boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.4)',
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  color: THEME.colors.textPrimary,
  borderLeft: `1px solid ${THEME.colors.border}`,
  overflowY: 'auto',
  transition: 'transform 0.25s ease',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 999,
};

const headerStyle: React.CSSProperties = {
  padding: '20px 20px 16px',
  borderBottom: `1px solid ${THEME.colors.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const sectionStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: `1px solid ${THEME.colors.border}`,
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: THEME.colors.textSecondary,
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
};

const inputStyle: React.CSSProperties = {
  backgroundColor: '#0f172a',
  color: THEME.colors.textStrong,
  border: `1px solid ${THEME.colors.border}`,
  borderRadius: '8px',
  padding: '10px 12px',
  width: '100%',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: '8px',
  border: 'none',
  fontWeight: 600,
  fontSize: '14px',
  cursor: 'pointer',
  backgroundColor: '#2563eb',
  color: 'white',
  transition: 'background-color 0.15s, opacity 0.15s',
};

const dangerButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: '8px',
  border: 'none',
  fontWeight: 600,
  fontSize: '14px',
  cursor: 'pointer',
  backgroundColor: '#ef4444',
  color: 'white',
  transition: 'background-color 0.15s, opacity 0.15s',
};


// Helper


const buildResolvedUserFromTask = (task: Task): IResolvedUser | null => {
  if (!task.assignedTo && !task.assignedToEmail) {
    return null;
  }

  return {
    id: task.assignedToId ?? null,
    name: task.assignedTo ?? '',
    email: task.assignedToEmail ?? task.assignedTo ?? '',
    loginName: task.assignedToLoginName ?? '',
  };
};


// Component


const TaskPanel: React.FC<ITaskPanelProps> = ({
  selectedTask,
  updateTask,
  saveTask,
  deleteTask,
  onClose,
  canAssign,
  context,
  currentUserName,
}): React.ReactElement | null => {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const siteUrl: string =
    context?.pageContext?.web?.absoluteUrl ??
    (typeof window !== 'undefined' ? window.location.origin : '');

  useEffect(() => {
    setSaveError(null);
  }, [selectedTask?.id]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!selectedTask) return null;

  const handleUpdate = (updates: Partial<Task>): void => {
    updateTask(selectedTask.id, updates);
  };

  const handleAssigneeChange = (user: IResolvedUser | null): void => {
    if (!user) {
      handleUpdate({
        assignedTo: '',
        assignedToId: undefined,
        assignedToEmail: undefined,
        assignedToLoginName: undefined,
      });
      return;
    }

    handleUpdate({
      assignedTo: user.name,
      assignedToId: user.id ?? undefined,
      assignedToEmail: user.email,
      assignedToLoginName: user.loginName,
    });
  };

  const handleSaveAndClose = async (): Promise<void> => {
    if (!selectedTask) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const saved = await saveTask(selectedTask);
      if (!saved) {
        setSaveError('Save may have partially succeeded. Please refresh and verify.');
        return;
      }
      onClose();
    } catch (err) {
      console.error('Save failed', err);
      setSaveError('The task could not be saved to SharePoint. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (): void => {
    deleteTask(selectedTask.id);
    onClose();
  };

  const resolvedAssignee = buildResolvedUserFromTask(selectedTask);

  return (
    <>
      <div style={overlayStyle} onClick={onClose} />

      <div ref={panelRef} style={panelStyle}>

        {/* Header */}
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '18px', color: THEME.colors.textStrong }}>
            Task Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              color: THEME.colors.textSecondary,
              fontSize: '24px',
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
            }}
          >
            x
          </button>
        </div>

        {/* Title */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Title</label>
          <input
            type="text"
            value={selectedTask.title}
            onChange={(e) => handleUpdate({ title: e.target.value })}
            style={inputStyle}
            placeholder="Task title"
          />
        </div>

        {/* Assigned To */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Assigned To</label>
          <PeoplePicker
            value={resolvedAssignee}
            onChange={handleAssigneeChange}
            siteUrl={siteUrl}
            placeholder="Search by name or email..."
            canEdit={canAssign}
          />
        </div>

        {/* Dates */}
        <div style={sectionStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Start Date</label>
              <input
                type="date"
                value={selectedTask.startDate?.split('T')[0] ?? ''}
                onChange={(e) => handleUpdate({ startDate: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Due Date</label>
              <input
                type="date"
                value={selectedTask.dueDate?.split('T')[0] ?? ''}
                onChange={(e) => handleUpdate({ dueDate: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Priority */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Priority</label>
          <select
            value={selectedTask.priority}
            onChange={(e) => handleUpdate({ priority: e.target.value as TaskPriority })}
            style={inputStyle}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        {/* Status */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Status</label>
          <select
            value={selectedTask.status}
            onChange={(e) => handleUpdate({ status: e.target.value as TaskStatus })}
            style={inputStyle}
          >
            <option value="Unassigned">Unassigned</option>
            <option value="Backlog">Backlog</option>
            <option value="ThisWeek">This Week</option>
            <option value="InProgress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {/* Description */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={selectedTask.description ?? ''}
            onChange={(e) => handleUpdate({ description: e.target.value })}
            style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
            placeholder="Add a description..."
          />
        </div>

        {/* Created By */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Created By</label>
          <div style={{ fontSize: '14px', color: THEME.colors.textStrong }}>
            {selectedTask.createdBy || currentUserName || 'Unknown'}
          </div>
        </div>

        {/* Save error banner */}
        {saveError && (
          <div style={{
            padding: '12px 20px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderTop: `1px solid ${THEME.colors.border}`,
          }}>
            <span style={{ color: '#ef4444', fontSize: '13px' }}>
              {saveError}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div style={{
          padding: '20px',
          display: 'flex',
          gap: '12px',
          borderTop: `1px solid ${THEME.colors.border}`,
          marginTop: 'auto',
        }}>
          <button
            type="button"
            onClick={handleSaveAndClose}
            disabled={isSaving}
            style={{ ...primaryButtonStyle, flex: 2, opacity: isSaving ? 0.7 : 1 }}
          >
            {isSaving ? 'Saving...' : 'Save & Close'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            style={{ ...dangerButtonStyle, flex: 1 }}
          >
            Delete
          </button>
        </div>

      </div>
    </>
  );
};

export default TaskPanel;