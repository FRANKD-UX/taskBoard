// TaskModal.tsx
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';

import type { Task, TaskStatus, TaskPriority, TaskSite } from './TaskTypes';
import { THEME } from './theme';
import PeoplePicker from './PeoplePicker';
import type { IResolvedUser } from './PeoplePicker';
import CollaborationPanel from './CollaborationPanel';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ITaskModalProps {
  task: Task | null;
  canAssign: boolean;
  siteUrl?: string;
  currentUserName: string;
  // The numeric SharePoint user ID of the logged-in user.
  // Needed so CollaborationPanel knows who sent each request.
  currentUserSpId: number | null;
  onSave: (task: Task) => Promise<Task | null>;
  onDelete: (id: string) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEMP_ID_PREFIX = 'temp_';

const TASK_STATUSES: TaskStatus[] = [
  'Unassigned',
  'Backlog',
  'ThisWeek',
  'InProgress',
  'Completed',
];

// Albertsdal is the main office and listed first so it is the default.
const SITES: Array<{ value: TaskSite; label: string }> = [
  { value: 'Albertsdal', label: 'Albertsdal (Main Office)' },
  { value: 'Troyville',  label: 'Troyville (Secondary Office)' },
];

const REQUEST_TYPES: string[] = ['Task', 'Incident'];
const DEPARTMENTS: string[] = ['IT', 'Finance', 'Operations', 'Support'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// Converts the string task id (used internally) to a numeric SP item ID.
// Returns null for unsaved tasks (temp_ prefix) since they have no SP id yet.
const toTaskSpId = (id: string): number | null => {
  if (!id || id.startsWith(TEMP_ID_PREFIX)) return null;
  const parsed = Number(id);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  backgroundColor: THEME.colors.background,
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
  backgroundColor: THEME.colors.primary,
  color: '#ffffff',
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
  color: '#ffffff',
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const TaskModal: React.FC<ITaskModalProps> = ({
  task,
  canAssign,
  siteUrl,
  currentUserName,
  currentUserSpId,
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

  // Sync draft state when the task prop changes (different task opened).
  useEffect(() => {
    if (!task) {
      setDraft(null);
      setAssignee(null);
      return;
    }

    const today = getTodayIso();
    setDraft({
      ...task,
      // Guarantee site always has a valid value — handles tasks created
      // before the Site column existed in the SP list.
      site: task.site || 'Albertsdal',
      startDate: task.startDate || today,
      createdBy: task.createdBy || currentUserName,
    });

    setAssignee(buildResolvedUser(task));
    setSaveError('');
    setTitleError('');
  }, [task?.id, currentUserName]);

  // Auto-focus title when creating a new task.
  useEffect(() => {
    if (draft && isNewTask) {
      const timer = setTimeout(() => titleRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
  }, [draft?.id, isNewTask]);

  // Close on Escape key.
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
      const message = error instanceof Error
        ? error.message
        : 'Could not save to SharePoint. Please try again.';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (): void => {
    onDelete(draft.id);
    onClose();
  };

  // The numeric SP item ID — null for new (unsaved) tasks.
  const taskSpId = toTaskSpId(draft.id);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
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

        {/* Body */}
        <div style={bodyStyle}>

          {/* Title */}
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
              style={{ ...inputStyle, borderColor: titleError ? '#ef4444' : THEME.colors.border }}
            />
            {titleError && (
              <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: '#ef4444' }}>
                {titleError}
              </span>
            )}
          </div>

          {/* Assigned To */}
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

          {/* Site — full width so both long labels are readable */}
          <div>
            <label style={labelStyle} htmlFor="tm-site">Site</label>
            <select
              id="tm-site"
              value={draft.site ?? 'Albertsdal'}
              onChange={(e) => update({ site: e.target.value as TaskSite })}
              style={inputStyle}
            >
              {SITES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Status + Priority */}
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

          {/* Start Date + Due Date */}
          <div style={gridTwoStyle}>
            <div>
              <label style={labelStyle} htmlFor="tm-start-date">
                Start Date
                {isNewTask && (
                  <span style={{
                    marginLeft: '6px',
                    fontSize: '10px',
                    color: THEME.colors.primary,
                    textTransform: 'none',
                    fontWeight: 400,
                  }}>
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

          {/* Request Type + Department */}
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

          {/* Description */}
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

          {/* Collaboration Panel — only shown for already-saved tasks.
              A new task has no SP item ID yet so collaboration cannot be
              requested until after the first save.                          */}
          {!isNewTask && (
            <CollaborationPanel
              taskSpId={taskSpId}
              taskTitle={draft.title}
              currentUserSpId={currentUserSpId}
              siteUrl={siteUrl}
            />
          )}

        </div>

        {/* Save error banner */}
        {saveError && (
          <div style={{
            padding: '10px 24px',
            backgroundColor: '#fef2f2',
            borderTop: `1px solid ${THEME.colors.border}`,
          }}>
            <span style={{ color: '#ef4444', fontSize: '13px' }}>{saveError}</span>
          </div>
        )}

        {/* Footer */}
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