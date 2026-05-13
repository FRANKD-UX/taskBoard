import type { IncidentSeverity, TaskDepartment } from '../../webparts/taskBoard/components/TaskTypes';
import type { IUserRole } from '../UserRoleService';
import { findIncidentCatalogEntry } from './IncidentCatalog';
import {
    getDepartmentRule,
    isDepartmentSupported,
    normalizeDepartment,
    normalizeIncidentSeverity,
    requiresSite as requiresSiteForDepartment,
} from './IncidentDepartmentRules';

export interface IIncidentUserContext extends Pick<IUserRole, 'role' | 'department' | 'email' | 'canAssign' | 'canAssignAcrossDepartments' | 'isDepartmentLead'> {
    id?: number | null;
    userId?: number | null;
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
    authorId?: number | null;
    createdByEmail?: string;
}

export type IncidentSiteRequirementInput =
    | TaskDepartment
    | string
    | IIncidentPolicyInput
    | null
    | undefined;

const getUserId = (user: IIncidentUserContext): number | null => {
    return user.userId ?? user.id ?? null;
};

const isManagerOrLead = (user: IIncidentUserContext): boolean => {
    return user.role === 'Manager' || user.role === 'TeamLead' || user.isDepartmentLead === true;
};

const isOwnerOrManager = (user: IIncidentUserContext): boolean => {
    return user.role === 'Owner' || user.role === 'Manager';
};

const hasCrossDepartmentAssignmentPermission = (user: IIncidentUserContext): boolean => {
    if (user.canAssignAcrossDepartments !== true) return false;
    return isOwnerOrManager(user);
};

const isSameDepartment = (userDepartment?: string, incidentDepartment?: string): boolean => {
    return normalizeDepartment(userDepartment) === normalizeDepartment(incidentDepartment);
};

const getSeverity = (incident: IIncidentPolicyInput): IncidentSeverity | null => {
    return normalizeIncidentSeverity(incident.severity);
};

const isCreator = (user: IIncidentUserContext, incident: IIncidentPolicyInput): boolean => {
    const actorId = getUserId(user);
    const actorEmail = user.email?.trim().toLowerCase();
    const incidentCreatorEmail = incident.createdByEmail?.trim().toLowerCase();

    if (actorId !== null && incident.authorId !== undefined && incident.authorId !== null) {
        return incident.authorId === actorId;
    }

    if (actorEmail && incidentCreatorEmail) {
        return actorEmail === incidentCreatorEmail;
    }

    return false;
};

export const canViewIncident = (
    user: IIncidentUserContext,
    incident: IIncidentPolicyInput
): boolean => {
    const actorId = getUserId(user);
    if (actorId === null) return false;
    if (incident.assignedToId === actorId) return true;

    const severity = getSeverity(incident);
    const sameDepartment = isSameDepartment(user.department, incident.department);

    if (severity === 'P1') {
        return sameDepartment && isManagerOrLead(user);
    }

    if (severity === 'P2' || severity === 'P3') {
        return sameDepartment;
    }

    if (severity === 'P4') {
        return sameDepartment || isCreator(user, incident);
    }

    return false;
};

export const canAssignIncident = (
    user: IIncidentUserContext,
    incident: IIncidentPolicyInput,
    targetUser?: IIncidentTargetUser | null
): boolean => {
    const actorId = getUserId(user);
    if (actorId === null || user.canAssign !== true) return false;
    if (!targetUser || targetUser.id === null) return false;

    if (targetUser.id === actorId) {
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
        return user.role === 'Owner' || isManagerOrLead(user);
    }

    return hasCrossDepartmentAssignmentPermission(user);
};

export const canClaimIncident = (
    user: IIncidentUserContext,
    incident: IIncidentPolicyInput
): boolean => {
    const actorId = getUserId(user);
    if (actorId === null) return false;
    if (incident.assignedToId !== undefined && incident.assignedToId !== null && incident.assignedToId !== actorId) {
        return false;
    }

    if (isSameDepartment(user.department, incident.department)) {
        return true;
    }

    return hasCrossDepartmentAssignmentPermission(user);
};

export const canCreateIncident = (
    user: IIncidentUserContext,
    department?: string,
    _incidentTypeTitle?: string
): boolean => {
    const actorId = getUserId(user);
    if (actorId === null || !department) return false;
    if (isSameDepartment(user.department, department)) return true;
    return hasCrossDepartmentAssignmentPermission(user);
};

export const canEditIncident = (
    user: IIncidentUserContext,
    incident: IIncidentPolicyInput
): boolean => {
    const actorId = getUserId(user);
    if (actorId === null) return false;

    if (incident.assignedToId === actorId) return true;

    const isUnassigned = incident.assignedToId === undefined || incident.assignedToId === null;
    if (isUnassigned && isCreator(user, incident)) return true;

    return isSameDepartment(user.department, incident.department) && isManagerOrLead(user);
};

const resolveDepartmentFromInput = (input: IncidentSiteRequirementInput): TaskDepartment | null => {
    if (!input) return null;
    if (typeof input === 'string') {
        if (!isDepartmentSupported(input)) return null;
        return normalizeDepartment(input);
    }
    if (typeof input === 'object') {
        return normalizeDepartment(input.department);
    }
    return null;
};

export const requiresSite = (input: IncidentSiteRequirementInput): boolean => {
    const department = resolveDepartmentFromInput(input);
    if (!department) return false;

    if (requiresSiteForDepartment(department)) {
        return true;
    }

    if (typeof input === 'object' && input?.incidentTypeTitle) {
        const catalogEntry = findIncidentCatalogEntry(department, input.incidentTypeTitle);
        if (catalogEntry?.requiresSite === true) {
            return true;
        }
    }

    return getDepartmentRule(department).requiresSite;
};

export const IncidentPolicy = {
    canViewIncident,
    canAssignIncident,
    canClaimIncident,
    canCreateIncident,
    canEditIncident,
    requiresSite,
};
