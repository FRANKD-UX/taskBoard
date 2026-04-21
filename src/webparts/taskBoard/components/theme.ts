// theme.ts
import type { Task, TaskStatus } from './TaskTypes';

export const THEME = {
    colors: {
        background: '#f8fafc',
        panel: '#ffffff',
        border: '#e2e8f0',

        textPrimary: '#1e293b',
        textSecondary: '#64748b',
        textStrong: '#0f172a',

        primary: '#0ea5e9',
        primaryHover: '#0284c7',
        primarySoft: '#e0f2fe',

        surfaceHover: '#f1f5f9',
    },

    statusColors: {
        Unassigned: '#94a3b8',
        Backlog: '#8b5cf6',
        ThisWeek: '#3b82f6',
        InProgress: '#f59e0b',
        Completed: '#22c55e',
    } as Record<TaskStatus, string>,

    priorityColors: {
        Low: '#22c55e',
        Medium: '#f59e0b',
        High: '#ef4444',
    } as Record<Task['priority'], string>,
};