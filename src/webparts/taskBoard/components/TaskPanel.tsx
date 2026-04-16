import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';

import type { Task } from './TaskTypes';
import { getSP } from '../../../pnpjsConfig';

interface IUserOption {
  id: number;
  name: string;
  email?: string;
}

export interface ITaskPanelProps {
  selectedTask: Task | null;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  onClose: () => void;
  canAssign: boolean;
}

const panelContainerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  width: '350px',
  height: '100vh',
  backgroundColor: '#1f2a44',
  color: '#f8fafc',
  borderLeft: '1px solid #334155',
  zIndex: 1100,
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  overflowY: 'auto'
};

const inputStyle: React.CSSProperties = {
  backgroundColor: '#0f172a',
  color: '#f8fafc',
  border: '1px solid #334155',
  borderRadius: '8px',
  padding: '8px'
};

const statusOptions: Task['status'][] = ['Unassigned', 'Backlog', 'ThisWeek', 'InProgress', 'Completed'];
const requestTypeOptions: string[] = ['Task', 'Incident'];
const departmentOptions: string[] = ['IT', 'Finance', 'Operations'];

const TaskPanel: React.FC<ITaskPanelProps> = ({ selectedTask, updateTask, deleteTask, onClose, canAssign }): React.ReactElement | null => {
  const dueDateInputRef = React.useRef<HTMLInputElement | null>(null);
  const [userOptions, setUserOptions] = useState<IUserOption[]>([]);
  const [assignedQuery, setAssignedQuery] = useState<string>('');
  const [showUserSuggestions, setShowUserSuggestions] = useState<boolean>(false);

  useEffect(() => {
    const loadUsers = async (): Promise<void> => {
      try {
        const sp = getSP();
        const users = await sp.web.siteUsers.select('Id', 'Title', 'Email').top(100)();
        setUserOptions(
          users
            .filter((user: any) => Boolean(user?.Title))
            .map((user: any) => ({
              id: user.Id,
              name: user.Title,
              email: user.Email
            }))
        );
      } catch {
        setUserOptions([]);
      }
    };

    loadUsers().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!selectedTask) {
      setAssignedQuery('');
      setShowUserSuggestions(false);
      return;
    }

    setAssignedQuery(selectedTask.assignedTo || '');
    setShowUserSuggestions(false);
  }, [selectedTask]);

  const filteredUserOptions = useMemo<IUserOption[]>(() => {
    const query = assignedQuery.trim().toLowerCase();
    if (!query) {
      return userOptions.slice(0, 6);
    }

    return userOptions.filter((user) => user.name.toLowerCase().indexOf(query) > -1).slice(0, 6);
  }, [assignedQuery, userOptions]);

  const handleAssigneeSelect = (user: IUserOption): void => {
    setAssignedQuery(user.name);
    setShowUserSuggestions(false);
    handleUpdateTask({
      assignedTo: user.name,
      assignedToId: user.id
    });
  };

  const handleAssigneeInputChange = (value: string): void => {
    setAssignedQuery(value);
    setShowUserSuggestions(true);

    const exactMatch = userOptions.find((user) => user.name.toLowerCase() === value.trim().toLowerCase());
    if (exactMatch) {
      handleUpdateTask({
        assignedTo: exactMatch.name,
        assignedToId: exactMatch.id
      });
      return;
    }

    handleUpdateTask({
      assignedTo: value,
      assignedToId: undefined
    });
  };

  const openDueDatePicker = (): void => {
    const input = dueDateInputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (input && typeof input.showPicker === 'function') {
      input.showPicker();
    }
  };

  const handleUpdateTask = (changes: Partial<Task>): void => {
    if (!selectedTask) {
      return;
    }

    updateTask(selectedTask.id, changes);
  };

  const handleDeleteTask = (): void => {
    if (!selectedTask) {
      return;
    }

    deleteTask(selectedTask.id);
    onClose();
  };

  const handleSaveAndClose = (): void => {
    onClose();
  };

  if (!selectedTask) {
    return null;
  }

  return (
    <div style={panelContainerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Task Details</strong>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '18px' }}
        >
          ×
        </button>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ color: '#cbd5e1', fontSize: '12px' }}>Title</span>
        <input
          type="text"
          value={selectedTask.title}
          onChange={(event) => handleUpdateTask({ title: event.target.value })}
          style={inputStyle}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ color: '#cbd5e1', fontSize: '12px' }}>Assigned user</span>
        {canAssign ? (
          <div style={{ display: 'grid', gap: '6px', position: 'relative' }}>
            <input
              type="text"
              value={assignedQuery}
              onChange={(event) => handleAssigneeInputChange(event.target.value)}
              onFocus={() => setShowUserSuggestions(true)}
              placeholder="Type a name"
              style={inputStyle}
            />
            {showUserSuggestions && filteredUserOptions.length > 0 && (
              <div
                style={{
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  backgroundColor: '#0f172a',
                  overflow: 'hidden'
                }}
              >
                {filteredUserOptions.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleAssigneeSelect(user);
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: 'transparent',
                      color: '#f8fafc',
                      border: 'none',
                      borderBottom: '1px solid #1f2937',
                      textAlign: 'left',
                      padding: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    {user.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ ...inputStyle, backgroundColor: '#111827' }}>{selectedTask.assignedTo || 'Unassigned'}</span>
            <span style={{ color: '#fbbf24', fontSize: '11px' }}>🔒 Assignment restricted (Manager required)</span>
          </div>
        )}
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ color: '#cbd5e1', fontSize: '12px' }}>Request Type</span>
        <select
          value={selectedTask.requestType || 'Task'}
          onChange={(event) => handleUpdateTask({ requestType: event.target.value })}
          style={inputStyle}
        >
          {requestTypeOptions.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ color: '#cbd5e1', fontSize: '12px' }}>Department</span>
        <select
          value={selectedTask.department || 'IT'}
          onChange={(event) => handleUpdateTask({ department: event.target.value })}
          style={inputStyle}
        >
          {departmentOptions.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ color: '#cbd5e1', fontSize: '12px' }}>Status</span>
        <select
          value={selectedTask.status}
          onChange={(event) => handleUpdateTask({ status: event.target.value as Task['status'] })}
          style={inputStyle}
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ color: '#cbd5e1', fontSize: '12px' }}>Due date</span>
        <input
          ref={dueDateInputRef}
          type="date"
          value={selectedTask.dueDate}
          onChange={(event) => handleUpdateTask({ dueDate: event.target.value })}
          onClick={openDueDatePicker}
          onFocus={openDueDatePicker}
          onKeyDown={(event) => {
            if (event.key !== 'Tab') {
              event.preventDefault();
            }
          }}
          inputMode="none"
          style={inputStyle}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ color: '#cbd5e1', fontSize: '12px' }}>Priority</span>
        <select
          value={selectedTask.priority}
          onChange={(event) => handleUpdateTask({ priority: event.target.value as Task['priority'] })}
          style={inputStyle}
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ color: '#cbd5e1', fontSize: '12px' }}>Description</span>
        <textarea
          value={selectedTask.description || ''}
          onChange={(event) => handleUpdateTask({ description: event.target.value })}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ color: '#cbd5e1', fontSize: '12px' }}>Created By</span>
        <span style={{ ...inputStyle, backgroundColor: '#111827' }}>{selectedTask.createdBy || 'Unknown'}</span>
      </label>

      <button
        type="button"
        onClick={handleSaveAndClose}
        style={{
          marginTop: '8px',
          backgroundColor: '#065f46',
          color: '#d1fae5',
          border: '1px solid #047857',
          borderRadius: '8px',
          padding: '8px',
          cursor: 'pointer'
        }}
      >
        Save & Close
      </button>

      <button
        type="button"
        onClick={handleDeleteTask}
        style={{
          marginTop: '8px',
          backgroundColor: '#7f1d1d',
          color: '#fecaca',
          border: '1px solid #991b1b',
          borderRadius: '8px',
          padding: '8px',
          cursor: 'pointer'
        }}
      >
        Delete Task
      </button>
    </div>
  );
};

export default TaskPanel;
