import type { IncidentSeverity, TaskDepartment } from '../../webparts/taskBoard/components/TaskTypes';

export interface IIncidentDepartmentRule {
    requiresSite: boolean;
    allowCrossDepartmentAssignment: boolean;
}

export type IncidentDepartmentRuleMap = Record<TaskDepartment, Readonly<IIncidentDepartmentRule>>;

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

export const DEPARTMENT_RULES: IncidentDepartmentRuleMap = {
    Support: {
        requiresSite: false,
        allowCrossDepartmentAssignment: false,
    },
    IT: {
        requiresSite: true,
        allowCrossDepartmentAssignment: false,
    },
    Accounts: {
        requiresSite: false,
        allowCrossDepartmentAssignment: false,
    },
    Operations: {
        requiresSite: false,
        allowCrossDepartmentAssignment: false,
    },
    Complaints: {
        requiresSite: false,
        allowCrossDepartmentAssignment: false,
    },
} as const;

export const isDepartmentSupported = (department?: string): department is TaskDepartment => {
    if (!department) return false;
    const normalized = department.toLowerCase().trim();
    return Boolean(DEPARTMENT_ALIAS_MAP[normalized]);
};

export const normalizeDepartment = (department?: string): TaskDepartment => {
    if (!department) return 'Support';
    const normalized = department.toLowerCase().trim();
    const mapped = DEPARTMENT_ALIAS_MAP[normalized];
    return mapped ?? 'Support';
};

export const getDepartmentRule = (department?: string): Readonly<IIncidentDepartmentRule> => {
    return DEPARTMENT_RULES[normalizeDepartment(department)];
};

export const requiresSite = (department?: string): boolean => {
    return getDepartmentRule(department).requiresSite;
};

export const isTaskDepartment = (department?: string): department is TaskDepartment => {
    return isDepartmentSupported(department);
};

export const normalizeIncidentSeverity = (severity?: string): IncidentSeverity | null => {
    if (!severity) return null;
    const normalized = severity.toUpperCase().trim();
    return VALID_INCIDENT_SEVERITIES.includes(normalized as IncidentSeverity)
        ? (normalized as IncidentSeverity)
        : null;
};

export const requiresSiteForDepartment = (department: TaskDepartment): boolean => {
    return requiresSite(department);
};

export const ensureValidDepartment = (department?: string): TaskDepartment => {
    if (!isDepartmentSupported(department)) {
        throw new Error(`Invalid department: ${department ?? 'unknown'}`);
    }
    return normalizeDepartment(department);
};

export const ensureValidSeverity = (severity?: string): IncidentSeverity => {
    const normalized = normalizeIncidentSeverity(severity);
    if (!normalized) {
        throw new Error(`Invalid incident severity: ${severity ?? 'unknown'}`);
    }
    return normalized;
};
