import type { IncidentSeverity, TaskDepartment } from '../../webparts/taskBoard/components/TaskTypes';
import { findIncidentCatalogEntry } from './IncidentCatalog';
import { normalizeDepartment, normalizeIncidentSeverity, requiresSiteForDepartment } from './IncidentDepartmentRules';

export interface IIncidentUserContext {
    id: number | null;
    role?: string;
    department?: string;
    canAssign: boolean;
    canAssignAcrossDepartments: boolean;
    isDepartmentLead?: boolean;
}

export interface IIncidentTargetUser {
    id: number | null;
    department?: string;
}

export interface IIncidentPolicyInput {
    department?: string;
    severity?: IncidentSeverity | string;
    assignedToId?: number | null;
    site?: string;
    incidentTypeTitle?: string;
}

const isManagerOrLead = (user: IIncidentUserContext): boolean => {
    return user.role === 'Manager' || user.role === 'TeamLead' || user.isDepartmentLead === true;
};

const isOwnerOrManager = (user: IIncidentUserContext): boolean => {
    return user.role === 'Owner' || user.role === 'Manager';
};

const hasCrossDepartmentAccess = (user: IIncidentUserContext): boolean => {
    return user.canAssignAcrossDepartments === true;
};

const isSameDepartment = (userDepartment?: string, incidentDepartment?: string): boolean => {
    return normalizeDepartment(userDepartment) === normalizeDepartment(incidentDepartment);
};

const getSeverity = (incident: IIncidentPolicyInput): IncidentSeverity | null => {
    return normalizeIncidentSeverity(incident.severity);
};

export const canViewIncident = (
    user: IIncidentUserContext,
    incident: IIncidentPolicyInput
): boolean => {
    if (!user?.id) return false;
    if (incident.assignedToId === user.id) return true;
    if (hasCrossDepartmentAccess(user)) return true;

    const severity = getSeverity(incident);
    const sameDepartment = isSameDepartment(user.department, incident.department);

    if (severity === 'P1') {
        if (sameDepartment && isManagerOrLead(user)) return true;
        return false;
    }

    if (severity === 'P2' || severity === 'P3' || severity === 'P4') {
        return sameDepartment;
    }

    return false;
};

export const canAssignIncident = (
    user: IIncidentUserContext,
    incident: IIncidentPolicyInput,
    targetUser?: IIncidentTargetUser | null
): boolean => {
    if (!user?.id || user.canAssign !== true) return false;
    if (!targetUser || targetUser.id === null) return false;

    if (targetUser.id === user.id) {
        return canClaimIncident(user, incident);
    }

    const incidentDepartment = normalizeDepartment(incident.department);
    const actorDepartment = normalizeDepartment(user.department);
    const targetDepartment = targetUser.department
        ? normalizeDepartment(targetUser.department)
        : incidentDepartment;

    const sameDepartmentAssignment =
        actorDepartment === incidentDepartment && targetDepartment === incidentDepartment;

    if (sameDepartmentAssignment) {
        return isManagerOrLead(user) || user.role === 'Owner';
    }

    return hasCrossDepartmentAccess(user) && isOwnerOrManager(user);
};

export const canClaimIncident = (
    user: IIncidentUserContext,
    incident: IIncidentPolicyInput
): boolean => {
    if (!user?.id) return false;
    if (incident.assignedToId && incident.assignedToId !== user.id) return false;
    if (hasCrossDepartmentAccess(user)) return true;
    return isSameDepartment(user.department, incident.department);
};

export const canCreateIncident = (
    user: IIncidentUserContext,
    department?: string
): boolean => {
    if (!user?.id || !department) return false;
    if (isSameDepartment(user.department, department)) return true;
    return hasCrossDepartmentAccess(user);
};

export const canEditIncident = (
    user: IIncidentUserContext,
    incident: IIncidentPolicyInput
): boolean => {
    if (!user?.id) return false;
    if (incident.assignedToId === user.id) return true;
    if (hasCrossDepartmentAccess(user)) return true;
    return isSameDepartment(user.department, incident.department) && isManagerOrLead(user);
};

export const requiresSite = (incident: IIncidentPolicyInput): boolean => {
    const department: TaskDepartment = normalizeDepartment(incident.department);
    if (requiresSiteForDepartment(department)) return true;
    const catalogEntry = findIncidentCatalogEntry(department, incident.incidentTypeTitle);
    return catalogEntry?.requiresSite === true;
};

export const IncidentPolicy = {
    canViewIncident,
    canAssignIncident,
    canClaimIncident,
    canCreateIncident,
    canEditIncident,
    requiresSite,
};
