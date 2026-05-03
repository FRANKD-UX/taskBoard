// theme.ts
import type { IncidentSeverity, Task, WorkItemStatus } from './TaskTypes';

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
        New: '#dc2626',
        Investigating: '#d97706',
        Escalated: '#7c2d12',
        Resolved: '#16a34a',
    } as Record<WorkItemStatus, string>,

    priorityColors: {
        Critical: '#b91c1c',
        Low: '#22c55e',
        Medium: '#f59e0b',
        High: '#ef4444',
    } as Record<Task['priority'], string>,

    severityColors: {
        P1: '#dc2626',
        P2: '#ea580c',
        P3: '#2563eb',
        P4: '#64748b',
    } as Record<IncidentSeverity, string>,
};
