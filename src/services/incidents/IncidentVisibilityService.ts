import type { Task } from '../../webparts/taskBoard/components/TaskTypes';
import {
    canViewIncident,
    type IIncidentUserContext,
} from './IncidentPolicy';

export const IncidentVisibilityService = {
    canViewIncident(
        user: IIncidentUserContext,
        incident: Pick<Task, 'department' | 'severity' | 'assignedToId' | 'incidentType' | 'site'>
    ): boolean {
        return canViewIncident(user, {
            department: incident.department,
            severity: incident.severity,
            assignedToId: incident.assignedToId ?? null,
            incidentTypeTitle: incident.incidentType?.title,
            site: incident.site,
        });
    },

    filterVisibleIncidents(
        user: IIncidentUserContext,
        incidents: Task[]
    ): Task[] {
        return incidents.filter((incident) => this.canViewIncident(user, incident));
    },
};