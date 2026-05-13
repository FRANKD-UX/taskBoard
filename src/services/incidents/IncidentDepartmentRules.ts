import type {
    IncidentSeverity,
    TaskDepartment,
} from '../../webparts/taskBoard/components/TaskTypes';

export interface IDepartmentRule {
    department: TaskDepartment;
    requiresSite: boolean;
}

export const ALLOWED_TASK_DEPARTMENTS: readonly TaskDepartment[] = [
    'Support',
    'IT',
    'Accounts',
    'Operations',
    'Complaints',
] as const;

export const DEPARTMENT_RULES: Record<TaskDepartment, IDepartmentRule> = {
    Support: {
        department: 'Support',
        requiresSite: false,
    },

    IT: {
        department: 'IT',
        requiresSite: true,
    },

    Accounts: {
        department: 'Accounts',
        requiresSite: false,
    },

    Operations: {
        department: 'Operations',
        requiresSite: false,
    },

    Complaints: {
        department: 'Complaints',
        requiresSite: false,
    },
} as const;

const DEPARTMENT_ALIAS_MAP: Record<string, TaskDepartment> = {
    support: 'Support',
    it: 'IT',
    accounts: 'Accounts',
    finance: 'Accounts',
    operations: 'Operations',
    complaints: 'Complaints',
};

const VALID_INCIDENT_SEVERITIES: readonly IncidentSeverity[] = [
    'P1',
    'P2',
    'P3',
    'P4',
] as const;

export const normalizeDepartment = (department?: string): TaskDepartment => {
    const normalized = (department ?? '').toLowerCase().trim();

    return DEPARTMENT_ALIAS_MAP[normalized] ?? 'Support';
};

export const isDepartmentSupported = (
    department?: string
): department is TaskDepartment => {
    if (!department) return false;

    const normalized = (department ?? '').toLowerCase().trim();

    return DEPARTMENT_ALIAS_MAP[normalized] !== undefined;
};

export const isTaskDepartment = isDepartmentSupported;

export const getDepartmentRule = (
    department?: string
): IDepartmentRule => {
    const normalizedDepartment = normalizeDepartment(department);

    return DEPARTMENT_RULES[normalizedDepartment];
};

export const requiresSite = (department?: string): boolean => {
    return getDepartmentRule(department).requiresSite;
};

export const requiresSiteForDepartment = (
    department: TaskDepartment
): boolean => {
    return DEPARTMENT_RULES[department].requiresSite;
};

export const normalizeIncidentSeverity = (
    severity?: string
): IncidentSeverity | null => {
    if (!severity) return null;

    const normalized = severity.toUpperCase().trim();

    return VALID_INCIDENT_SEVERITIES.includes(normalized as IncidentSeverity)
        ? normalized as IncidentSeverity
        : null;
};

export const ensureValidDepartment = (
    department?: string
): TaskDepartment => {
    if (!isDepartmentSupported(department)) {
        throw new Error(`Invalid department: ${department ?? 'unknown'}`);
    }

    return normalizeDepartment(department);
};

export const ensureValidSeverity = (
    severity?: string
): IncidentSeverity => {
    const normalizedSeverity = normalizeIncidentSeverity(severity);

    if (!normalizedSeverity) {
        throw new Error(`Invalid incident severity: ${severity ?? 'unknown'}`);
    }

    return normalizedSeverity;
};