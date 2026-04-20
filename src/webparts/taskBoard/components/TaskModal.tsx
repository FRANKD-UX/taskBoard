// TaskModal.tsx
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';

import type { Task, TaskStatus, TaskPriority } from './TaskTypes';
import { THEME } from './theme';
import PeoplePicker from './PeoplePicker';
import type { IResolvedUser } from './PeoplePicker';

export interface ITaskModalProps {
  task: Task | null;
  canAssign: boolean;
  siteUrl?: string;
  currentUserName: string;
  onSave: (task: Task) => Promise<Task | null>;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const TEMP_ID_PREFIX = 'temp_';

const TASK_STATUSES: TaskStatus[] = [
  'Unassigned',
  'Backlog',
  'ThisWeek',
  'InProgress',
  'Completed',
];

const REQUEST_TYPES: string[] = ['Task', 'Incident'];
const DEPARTMENTS: string[] = ['IT', 'Finance', 'Operations', 'Support'];

const getTodayIso = (): string => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};

const buildResolvedUser = (task: Task): IResolvedUser | null => {
  if (!task.assignedTo && !task.assignedToEmail) return null;
  return {
    id: task.assignedToId ?? null,
    name: task.assignedTo ?? '',
    email: task.assignedToEmail ?? task.assignedTo ?? '',
    loginName: task.assignedToLoginName ?? '',
  };
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  zIndex: 1100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
};

const modalStyle: React.CSSProperties = {
  backgroundColor: THEME.colors.panel,
  border: `1px solid ${THEME.colors.border}`,
  borderRadius: '14px',
  width: '100%',
  maxWidth: '560px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 28px 56px rgba(0,0,0,0.15)',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  padding: '20px 24px 16px',
  borderBottom: `1px solid ${THEME.colors.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexShrink: 0,
};

const bodyStyle: React.CSSProperties = {
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
  overflowY: 'auto',
  flex: 1,
};

const footerStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderTop: `1px solid ${THEME.colors.border}`,
  display: 'flex',
  gap: '10px',
  flexShrink: 0,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: THEME.colors.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#ffffff',
  color: THEME.colors.textStrong,
  border: `1px solid ${THEME.colors.border}`,
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const gridTwoStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '14px',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: THEME.colors.textSecondary,
  fontSize: '24px',
  cursor: 'pointer',
  lineHeight: 1,
  padding: '0 4px',
};

const primaryBtnStyle: React.CSSProperties = {
  flex: 2,
  padding: '11px 16px',
  borderRadius: '8px',
  border: 'none',
  fontWeight: 700,
  fontSize: '14px',
  cursor: 'pointer',
  backgroundColor: '#2563eb',
  color: '#fff',
  transition: 'opacity 0.15s',
};

const dangerBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '11px 16px',
  borderRadius: '8px',
  border: 'none',
  fontWeight: 700,
  fontSize: '14px',
  cursor: 'pointer',
  backgroundColor: '#ef4444',
  color: '#fff',
};

const cancelBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '11px 16px',
  borderRadius: '8px',
  border: `1px solid ${THEME.colors.border}`,
  fontWeight: 600,
  fontSize: '14px',
  cursor: 'pointer',
  backgroundColor: 'transparent',
  color: THEME.colors.textPrimary,
};

const TaskModal: React.FC<ITaskModalProps> = ({
  task,
  canAssign,
  siteUrl,
  currentUserName,
  onSave,
  onDelete,
  onClose,
}): React.ReactElement | null => {
  const [draft, setDraft] = useState<Task | null>(null);
  const [assignee, setAssignee] = useState<IResolvedUser | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string>('');
  const [titleError, setTitleError] = useState<string>('');

  const titleRef = useRef<HTMLInputElement>(null);

  const isNewTask = Boolean(draft?.id.startsWith(TEMP_ID_PREFIX));

  useEffect(() => {
    if (!task) {
      setDraft(null);
      setAssignee(null);
      return;
    }

    const today = getTodayIso();

    setDraft({
      ...task,
      startDate: task.startDate || today,
      createdBy: task.createdBy || currentUserName,
    });

    setAssignee(buildResolvedUser(task));
    setSaveError('');
    setTitleError('');
  }, [task?.id, currentUserName]);

  useEffect(() => {
    if (draft && isNewTask) {
      const timer = setTimeout(() => titleRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [draft?.id, isNewTask]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!draft) return null;

  const update = (patch: Partial<Task>): void => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    if ('title' in patch) setTitleError('');
  };

  const handleAssigneeChange = (user: IResolvedUser | null): void => {
    setAssignee(user);
    update({
      assignedTo: user?.name ?? '',
      assignedToId: user?.id ?? undefined,
      assignedToEmail: user?.email ?? undefined,
      assignedToLoginName: user?.loginName ?? undefined,
    });
  };

  const handleSave = async (): Promise<void> => {
    if (!draft.title.trim()) {
      setTitleError('Title is required');
      titleRef.current?.focus();
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      const saved = await onSave(draft);
      if (!saved) {
        setSaveError('Could not save task. Please verify required fields and assignee selection.');
        return;
      }
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save to SharePoint. Please try again.';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (): void => {
    onDelete(draft.id);
    onClose();
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>

        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: THEME.colors.textStrong }}>
              {isNewTask ? 'New Task' : 'Task Details'}
            </h2>
            {!isNewTask && (
              <div style={{ fontSize: '11px', color: THEME.colors.textSecondary, marginTop: '2px' }}>
                Created by {draft.createdBy || currentUserName || 'Unknown'}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={closeBtnStyle}>
            &times;
          </button>
        </div>

        <div style={bodyStyle}>

          <div>
            <label style={labelStyle} htmlFor="tm-title">
              Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              ref={titleRef}
              id="tm-title"
              type="text"
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="Enter task title"
              style={{
                ...inputStyle,
                borderColor: titleError ? '#ef4444' : THEME.colors.border,
              }}
            />
            {titleError && (
              <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: '#ef4444' }}>
                {titleError}
              </span>
            )}
          </div>

          {canAssign && (
            <div>
              <label style={labelStyle}>Assigned To</label>
              <PeoplePicker
                value={assignee}
                onChange={handleAssigneeChange}
                placeholder="Search by name or email..."
                canEdit={true}
                siteUrl={siteUrl}
              />
            </div>
          )}

          <div style={gridTwoStyle}>
            <div>
              <label style={labelStyle} htmlFor="tm-status">Status</label>
              <select
                id="tm-status"
                value={draft.status}
                onChange={(e) => update({ status: e.target.value as TaskStatus })}
                style={inputStyle}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="tm-priority">Priority</label>
              <select
                id="tm-priority"
                value={draft.priority}
                onChange={(e) => update({ priority: e.target.value as TaskPriority })}
                style={inputStyle}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div style={gridTwoStyle}>
            <div>
              <label style={labelStyle} htmlFor="tm-start-date">
                Start Date
                {isNewTask && (
                  <span style={{ marginLeft: '6px', fontSize: '10px', color: '#2563eb', textTransform: 'none', fontWeight: 400 }}>
                    (auto)
                  </span>
                )}
              </label>
              <input
                id="tm-start-date"
                type="date"
                value={draft.startDate?.split('T')[0] ?? ''}
                onChange={(e) => update({ startDate: e.target.value })}
                style={isNewTask ? { ...inputStyle, opacity: 0.6, cursor: 'not-allowed' } : inputStyle}
                readOnly={isNewTask}
              />
            </div>
            <div>
              <label style={labelStyle} htmlFor="tm-due-date">Due Date</label>
              <input
                id="tm-due-date"
                type="date"
                value={draft.dueDate?.split('T')[0] ?? ''}
                min={draft.startDate?.split('T')[0]}
                onChange={(e) => update({ dueDate: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={gridTwoStyle}>
            <div>
              <label style={labelStyle} htmlFor="tm-request-type">Request Type</label>
              <select
                id="tm-request-type"
                value={draft.requestType}
                onChange={(e) => update({ requestType: e.target.value })}
                style={inputStyle}
              >
                {REQUEST_TYPES.map((rt) => (
                  <option key={rt} value={rt}>{rt}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="tm-department">Department</label>
              <select
                id="tm-department"
                value={draft.department}
                onChange={(e) => update({ department: e.target.value })}
                style={inputStyle}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle} htmlFor="tm-description">Description</label>
            <textarea
              id="tm-description"
              value={draft.description ?? ''}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Add a description..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
            />
          </div>

        </div>

        {saveError && (
          <div style={{
            padding: '10px 24px',
            backgroundColor: '#fef2f2',
            borderTop: `1px solid ${THEME.colors.border}`,
          }}>
            <span style={{ color: '#ef4444', fontSize: '13px' }}>{saveError}</span>
          </div>
        )}

        <div style={footerStyle}>
          {isNewTask && (
            <button type="button" onClick={onClose} style={cancelBtnStyle}>
              Cancel
            </button>
          )}

          {!isNewTask && (
            <button type="button" onClick={handleDelete} style={dangerBtnStyle}>
              Delete
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{ ...primaryBtnStyle, opacity: isSaving ? 0.65 : 1 }}
          >
            {isSaving ? 'Saving...' : isNewTask ? 'Create Task' : 'Save & Close'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default TaskModal;
