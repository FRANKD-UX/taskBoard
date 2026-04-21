// CreateTaskModal.tsx
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';

import type { Task, TaskStatus, TaskPriority, TaskSite } from './TaskTypes';
import { THEME } from './theme';
import PeoplePicker from './PeoplePicker';
import type { IResolvedUser } from './PeoplePicker';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ICreateTaskModalProps {
  defaultStatus: TaskStatus;
  /** The SharePoint site URL — needed so PeoplePicker can call the REST API */
  siteUrl: string;
  /** Whether the current user has permission to assign tasks */
  canAssign: boolean;
  onConfirm: (draft: Task) => void;
  onCancel: () => void;
}

interface IFormState {
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  site: TaskSite;
  startDate: string;
  dueDate: string;
  description: string;
  requestType: string;
  department: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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
const TEMP_ID_PREFIX = 'temp_';

const getTodayIso = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
  maxWidth: '520px',
  boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  padding: '20px 24px 16px',
  borderBottom: `1px solid ${THEME.colors.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const bodyStyle: React.CSSProperties = {
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  overflowY: 'auto',
  maxHeight: '72vh',
};

const footerStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderTop: `1px solid ${THEME.colors.border}`,
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '10px',
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
};

const gridTwoColumnStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '14px',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CreateTaskModal: React.FC<ICreateTaskModalProps> = ({
  defaultStatus,
  siteUrl,
  canAssign,
  onConfirm,
  onCancel,
}): React.ReactElement => {
  const today = getTodayIso();

  const [form, setForm] = useState<IFormState>({
    title: '',
    status: defaultStatus,
    priority: 'Medium',
    // Default to the main office — users at Troyville can change it.
    site: 'Albertsdal',
    startDate: today,
    dueDate: '',
    description: '',
    requestType: 'Task',
    department: 'IT',
  });

  const [assignee, setAssignee] = useState<IResolvedUser | null>(null);
  const [titleError, setTitleError] = useState<string>('');

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleFieldChange = <K extends keyof IFormState>(
    field: K,
    value: IFormState[K]
  ): void => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (field === 'title') setTitleError('');
  };

  const handleConfirm = (): void => {
    if (!form.title.trim()) {
      setTitleError('Title is required');
      titleRef.current?.focus();
      return;
    }

    const draft: Task = {
      id: `${TEMP_ID_PREFIX}${Date.now()}`,
      title: form.title.trim(),
      status: form.status,
      priority: form.priority,
      site: form.site,
      startDate: form.startDate,
      dueDate: form.dueDate || undefined,
      description: form.description.trim() || undefined,
      requestType: form.requestType,
      department: form.department,
      createdAt: new Date().toISOString(),
      assignedTo: assignee?.name ?? '',
      assignedToId: assignee?.id ?? undefined,
      assignedToEmail: assignee?.email ?? undefined,
      assignedToLoginName: assignee?.loginName ?? undefined,
      createdBy: '',
    };

    onConfirm(draft);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: THEME.colors.textStrong }}>
            New Task
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              color: THEME.colors.textSecondary,
              fontSize: '22px',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '2px 6px',
            }}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div style={bodyStyle}>

          {/* Title */}
          <div>
            <label style={labelStyle} htmlFor="ctm-title">
              Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              ref={titleRef}
              id="ctm-title"
              type="text"
              value={form.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Enter task title"
              style={{
                ...inputStyle,
                borderColor: titleError ? '#ef4444' : THEME.colors.border,
              }}
            />
            {titleError && (
              <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
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
                onChange={setAssignee}
                siteUrl={siteUrl}
                placeholder="Search by name or email..."
                canEdit={true}
              />
            </div>
          )}

          {/* Site — full width so both long labels are readable */}
          <div>
            <label style={labelStyle} htmlFor="ctm-site">Site</label>
            <select
              id="ctm-site"
              value={form.site}
              onChange={(e) => handleFieldChange('site', e.target.value as TaskSite)}
              style={inputStyle}
            >
              {SITES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Status + Priority */}
          <div style={gridTwoColumnStyle}>
            <div>
              <label style={labelStyle} htmlFor="ctm-status">Status</label>
              <select
                id="ctm-status"
                value={form.status}
                onChange={(e) => handleFieldChange('status', e.target.value as TaskStatus)}
                style={inputStyle}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="ctm-priority">Priority</label>
              <select
                id="ctm-priority"
                value={form.priority}
                onChange={(e) => handleFieldChange('priority', e.target.value as TaskPriority)}
                style={inputStyle}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          {/* Start Date (auto-set) + Due Date */}
          <div style={gridTwoColumnStyle}>
            <div>
              <label style={labelStyle} htmlFor="ctm-start-date">
                Start Date
                <span style={{
                  marginLeft: '6px',
                  fontSize: '10px',
                  color: THEME.colors.primary,
                  textTransform: 'none',
                  fontWeight: 400,
                }}>
                  (auto)
                </span>
              </label>
              <input
                id="ctm-start-date"
                type="date"
                value={form.startDate}
                readOnly
                style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>
            <div>
              <label style={labelStyle} htmlFor="ctm-due-date">Due Date</label>
              <input
                id="ctm-due-date"
                type="date"
                value={form.dueDate}
                min={form.startDate}
                onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Request Type + Department */}
          <div style={gridTwoColumnStyle}>
            <div>
              <label style={labelStyle} htmlFor="ctm-request-type">Request Type</label>
              <select
                id="ctm-request-type"
                value={form.requestType}
                onChange={(e) => handleFieldChange('requestType', e.target.value)}
                style={inputStyle}
              >
                {REQUEST_TYPES.map((rt) => (
                  <option key={rt} value={rt}>{rt}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="ctm-department">Department</label>
              <select
                id="ctm-department"
                value={form.department}
                onChange={(e) => handleFieldChange('department', e.target.value)}
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
            <label style={labelStyle} htmlFor="ctm-description">Description</label>
            <textarea
              id="ctm-description"
              value={form.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Optional description..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
            />
          </div>

        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: `1px solid ${THEME.colors.border}`,
              backgroundColor: 'transparent',
              color: THEME.colors.textPrimary,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: THEME.colors.primary,
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Create Task
          </button>
        </div>

      </div>
    </div>
  );
};

export default CreateTaskModal;