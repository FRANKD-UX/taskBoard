import type { IncidentSeverity, IncidentSlaStatus } from './TaskTypes';

interface IIncidentSlaDefinition {
    responseMinutes: number;
    resolutionMinutes: number;
}

export interface IIncidentSlaSnapshot extends IIncidentSlaDefinition {
    deadline: string;
    status: IncidentSlaStatus;
}

const INCIDENT_SLA_MAP: Record<IncidentSeverity, IIncidentSlaDefinition> = {
    P1: { responseMinutes: 15, resolutionMinutes: 120 },
    P2: { responseMinutes: 30, resolutionMinutes: 240 },
    P3: { responseMinutes: 120, resolutionMinutes: 1440 },
    P4: { responseMinutes: 240, resolutionMinutes: 2880 },
};

export const buildIncidentSla = (
    severity: IncidentSeverity,
    now: Date = new Date()
): IIncidentSlaSnapshot => {
    const definition = INCIDENT_SLA_MAP[severity];
    const deadline = new Date(now.getTime() + definition.resolutionMinutes * 60 * 1000);

    return {
        responseMinutes: definition.responseMinutes,
        resolutionMinutes: definition.resolutionMinutes,
        deadline: deadline.toISOString(),
        status: 'OnTrack',
    };
};
