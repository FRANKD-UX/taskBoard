import type { IncidentSeverity, TaskDepartment } from '../../webparts/taskBoard/components/TaskTypes';

export const ALLOWED_TASK_DEPARTMENTS: readonly TaskDepartment[] = [
    'Support',
    'IT',
    'Accounts',
    'Operations',
    'Complaints',
] as const;

const DEPARTMENT_ALIAS_MAP: Record<string, TaskDepartment> = {
    support: 'Support',
    it: 'IT',
    accounts: 'Accounts',
    finance: 'Accounts',
    operations: 'Operations',
    complaints: 'Complaints',
};

const VALID_INCIDENT_SEVERITIES: readonly IncidentSeverity[] = ['P1', 'P2', 'P3', 'P4'] as const;

export const normalizeDepartment = (department?: string): TaskDepartment => {
    const normalized = (department ?? '').toLowerCase().trim();
    const mapped = DEPARTMENT_ALIAS_MAP[normalized];
    return mapped ?? 'Support';
};

export const isTaskDepartment = (department?: string): department is TaskDepartment => {
    if (!department) return false;
    const normalized = (department ?? '').toLowerCase().trim();
    return Boolean(DEPARTMENT_ALIAS_MAP[normalized]);
};

export const normalizeIncidentSeverity = (severity?: string): IncidentSeverity | null => {
    if (!severity) return null;
    const normalized = severity.toUpperCase().trim();
    return VALID_INCIDENT_SEVERITIES.includes(normalized as IncidentSeverity)
        ? (normalized as IncidentSeverity)
        : null;
};

export const requiresSiteForDepartment = (department: TaskDepartment): boolean => {
    return department === 'IT';
};

export const ensureValidDepartment = (department?: string): TaskDepartment => {
    const raw = (department ?? '').toLowerCase().trim();
    const mapped = DEPARTMENT_ALIAS_MAP[raw];
    if (!mapped) {
        throw new Error(`Invalid department: ${department ?? 'unknown'}`);
    }
    return mapped;
};

export const ensureValidSeverity = (severity?: string): IncidentSeverity => {
    const normalized = normalizeIncidentSeverity(severity);
    if (!normalized) {
        throw new Error(`Invalid incident severity: ${severity ?? 'unknown'}`);
    }
    return normalized;
};
