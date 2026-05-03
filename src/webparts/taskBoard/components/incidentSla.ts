import type { IncidentSeverity, IncidentSlaStatus, TaskPriority } from './TaskTypes';

interface IIncidentSlaDefinition {
    responseMinutes: number;
    resolutionMinutes: number;
}

export interface IIncidentSlaSnapshot extends IIncidentSlaDefinition {
    responseDueDate: string;
    resolutionDueDate: string;
    deadline: string;
    status: IncidentSlaStatus;
}

const INCIDENT_SLA_MAP: Record<IncidentSeverity, IIncidentSlaDefinition> = {
    P1: { responseMinutes: 15, resolutionMinutes: 60 },
    P2: { responseMinutes: 60, resolutionMinutes: 240 },
    P3: { responseMinutes: 240, resolutionMinutes: 1440 },
    P4: { responseMinutes: 1440, resolutionMinutes: 4320 },
};

export const getPriorityFromSeverity = (severity?: IncidentSeverity): TaskPriority => {
    switch (severity) {
        case 'P1':
            return 'Critical';
        case 'P2':
            return 'High';
        case 'P3':
            return 'Medium';
        case 'P4':
        default:
            return 'Low';
    }
};

export const buildIncidentSla = (
    severity: IncidentSeverity,
    now: Date = new Date()
): IIncidentSlaSnapshot => {
    const definition = INCIDENT_SLA_MAP[severity];
    const responseDueDate = new Date(now.getTime() + definition.responseMinutes * 60 * 1000);
    const resolutionDueDate = new Date(now.getTime() + definition.resolutionMinutes * 60 * 1000);

    return {
        responseMinutes: definition.responseMinutes,
        resolutionMinutes: definition.resolutionMinutes,
        responseDueDate: responseDueDate.toISOString(),
        resolutionDueDate: resolutionDueDate.toISOString(),
        deadline: resolutionDueDate.toISOString(),
        status: 'OnTrack',
    };
};
