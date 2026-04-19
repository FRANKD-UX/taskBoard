// theme.ts
import type { TaskStatus, Task } from './TaskTypes';

export const THEME = {
    colors: {
        background: '#f8fafc',        // very light gray-blue
        panel: '#ffffff',             // pure white cards/panels
        border: '#e2e8f0',            // soft gray border
        textPrimary: '#1e293b',       // dark slate for main text
        textSecondary: '#64748b',     // medium gray for secondary text
        textStrong: '#0f172a'         // almost black for headings
    },
    statusColors: {
        Unassigned: '#94a3b8',
        Backlog: '#8b5cf6',
        ThisWeek: '#3b82f6',
        InProgress: '#f59e0b',
        Completed: '#22c55e'
    } as Record<TaskStatus, string>,
    priorityColors: {
        Low: '#22c55e',
        Medium: '#f59e0b',
        High: '#ef4444'
    } as Record<Task['priority'], string>
};