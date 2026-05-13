import type { Task } from '../../webparts/taskBoard/components/TaskTypes';
import {
    canAssignIncident,
    canClaimIncident,
    type IIncidentTargetUser,
    type IIncidentUserContext,
} from './IncidentPolicy';

type IncidentAssignmentInput = Pick<
    Task,
    'department' | 'severity' | 'assignedToId' | 'incidentType' | 'site'
>;

export const IncidentAssignmentService = {
    canAssignIncident(
        user: IIncidentUserContext,
        incident: IncidentAssignmentInput,
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
        incident: IncidentAssignmentInput
    ): boolean {
        return canClaimIncident(user, {
            department: incident.department,
            severity: incident.severity,
            assignedToId: incident.assignedToId ?? null,
            incidentTypeTitle: incident.incidentType?.title,
            site: incident.site,
        });
    },

    canAssignToUser(
        user: IIncidentUserContext,
        incident: IncidentAssignmentInput,
        targetUser?: IIncidentTargetUser | null
    ): boolean {
        return this.canAssignIncident(user, incident, targetUser);
    },

    canClaimSelf(
        user: IIncidentUserContext,
        incident: IncidentAssignmentInput
    ): boolean {
        return this.canClaimIncident(user, incident);
    },
};