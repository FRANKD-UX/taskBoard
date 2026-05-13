import type {
    IncidentSeverity,
    TaskDepartment,
} from '../../webparts/taskBoard/components/TaskTypes';

export interface IIncidentCatalogItem {
    title: string;
    severity: IncidentSeverity;
    requiresSite?: boolean;
}

export type IncidentCatalog = Record<TaskDepartment, readonly IIncidentCatalogItem[]>;

export const INCIDENT_CATALOG: IncidentCatalog = {
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
        { title: 'Internal systems down', severity: 'P1' },
        { title: 'Slow internet', severity: 'P2' },
        { title: 'Phones not working', severity: 'P1' },
        { title: 'Hardware issues', severity: 'P3' },
        { title: 'Set up laptop for new employee', severity: 'P2' },
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

const normalizeText = (value?: string): string => {
    return (value ?? '').trim().toLowerCase();
};

export const getIncidentCatalogForDepartment = (
    department: TaskDepartment
): readonly IIncidentCatalogItem[] => {
    return INCIDENT_CATALOG[department];
};

export const findIncidentCatalogEntry = (
    department: TaskDepartment,
    title?: string
): IIncidentCatalogItem | null => {
    const normalizedTitle = normalizeText(title);

    if (!normalizedTitle) return null;

    return INCIDENT_CATALOG[department].find(
        (item) => normalizeText(item.title) === normalizedTitle
    ) ?? null;
};

export const isIncidentTitleAllowedForDepartment = (
    department: TaskDepartment,
    title?: string
): boolean => {
    return findIncidentCatalogEntry(department, title) !== null;
};