import type { IncidentSeverity, TaskDepartment } from '../../webparts/taskBoard/components/TaskTypes';
import { normalizeDepartment } from './IncidentDepartmentRules';

export type IncidentDepartmentName = TaskDepartment;

export interface IIncidentCatalogItem {
    title: string;
    severity: IncidentSeverity;
    requiresSite?: boolean;
}

export type IncidentDepartmentCatalogMap = Record<IncidentDepartmentName, readonly IIncidentCatalogItem[]>;

export const INCIDENT_CATALOG: IncidentDepartmentCatalogMap = {
    Support: [
        { title: 'Misdirected client', severity: 'P4' },
        { title: 'Incomplete escalation', severity: 'P1' },
        { title: 'Maintenance update', severity: 'P1' },
        { title: 'Complaints update', severity: 'P2' },
        { title: 'Tech request update', severity: 'P1' },
        { title: 'VIP client is down', severity: 'P1' },
    ],
    IT: [
        { title: 'No internet on site', severity: 'P1', requiresSite: true },
        { title: 'Internal systems down', severity: 'P1', requiresSite: true },
        { title: 'Slow internet', severity: 'P2', requiresSite: true },
        { title: 'Phones not working', severity: 'P1', requiresSite: true },
        { title: 'Hardware issues', severity: 'P3', requiresSite: true },
        { title: 'Set up laptop for new employee', severity: 'P2', requiresSite: true },
    ],
    Accounts: [
        { title: "PPP's", severity: 'P1' },
        { title: 'Payment allocation', severity: 'P3' },
        { title: 'Payment arrangements', severity: 'P4' },
        { title: 'Update clients details', severity: 'P3' },
    ],
    Operations: [
        { title: 'Tech request', severity: 'P1' },
    ],
    Complaints: [],
} as const;

export const findIncidentCatalogEntry = (
    department?: string,
    title?: string
): IIncidentCatalogItem | null => {
    if (!department || !title) return null;
    const normalizedDepartment = normalizeDepartment(department);
    const normalizedTitle = title.trim().toLowerCase();
    return INCIDENT_CATALOG[normalizedDepartment].find((item) => item.title.trim().toLowerCase() === normalizedTitle) ?? null;
};

export const isIncidentTitleAllowedForDepartment = (department?: string, title?: string): boolean => {
    if (!department || !title) return false;
    return Boolean(findIncidentCatalogEntry(department, title));
};
