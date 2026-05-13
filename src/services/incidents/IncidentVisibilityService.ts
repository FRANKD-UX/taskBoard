import type { Task } from '../../webparts/taskBoard/components/TaskTypes';
import { canViewIncident, type IIncidentUserContext } from './IncidentPolicy';

export const IncidentVisibilityService = {
    canViewIncident(
        user: IIncidentUserContext,
        incident: Pick<Task, 'department' | 'severity' | 'assignedToId' | 'incidentType' | 'authorId' | 'createdBy'>
    ): boolean {
        return canViewIncident(user, {
            department: incident.department,
            severity: incident.severity,
            assignedToId: incident.assignedToId ?? null,
            incidentTypeTitle: incident.incidentType?.title,
            authorId: incident.authorId ?? null,
        });
    },

    filterVisibleIncidents(
        incidents: Task[],
        user: IIncidentUserContext
    ): Task[] {
        return incidents.filter((incident) => this.canViewIncident(user, incident));
    },
};
