import type { Task } from '../../webparts/taskBoard/components/TaskTypes';
import {
    canAssignIncident,
    canClaimIncident,
    type IIncidentTargetUser,
    type IIncidentUserContext,
} from './IncidentPolicy';

export const IncidentAssignmentService = {
    canAssignIncident(
        user: IIncidentUserContext,
        incident: Pick<Task, 'department' | 'severity' | 'assignedToId' | 'incidentType' | 'site'>,
        targetUser?: IIncidentTargetUser | null
    ): boolean {
        return canAssignIncident(
            user,
            {
                department: incident.department,
                severity: incident.severity,
                assignedToId: incident.assignedToId ?? null,
                incidentTypeTitle: incident.incidentType?.title,
                site: incident.site,
            },
            targetUser
        );
    },

    canClaimIncident(
        user: IIncidentUserContext,
        incident: Pick<Task, 'department' | 'severity' | 'assignedToId' | 'incidentType' | 'site'>
    ): boolean {
        return canClaimIncident(user, {
            department: incident.department,
            severity: incident.severity,
            assignedToId: incident.assignedToId ?? null,
            incidentTypeTitle: incident.incidentType?.title,
            site: incident.site,
        });
    },
};
