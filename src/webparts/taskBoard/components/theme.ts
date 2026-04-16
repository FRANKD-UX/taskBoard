import type { TaskStatus, Task } from './TaskTypes';

export const THEME = {
  colors: {
    background: '#171c33',
    panel: '#1f2a44',
    border: '#334155',
    textPrimary: '#e2e8f0',
    textSecondary: '#94a3b8',
    textStrong: '#f8fafc'
  },
  statusColors: {
    Unassigned: '#6b7280',
    Backlog: '#7c3aed',
    ThisWeek: '#0ea5e9',
    InProgress: '#f59e0b',
    Completed: '#22c55e'
  } as Record<TaskStatus, string>,
  priorityColors: {
    Low: '#22c55e',
    Medium: '#f59e0b',
    High: '#ef4444'
  } as Record<Task['priority'], string>
};
