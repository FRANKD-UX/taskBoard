"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentPolicy = exports.requiresSite = exports.canEditIncident = exports.canCreateIncident = exports.canClaimIncident = exports.canAssignIncident = exports.canViewIncident = void 0;
var IncidentCatalog_1 = require("./IncidentCatalog");
var IncidentDepartmentRules_1 = require("./IncidentDepartmentRules");
var isManagerOrLead = function (user) {
    return (user.role === 'Manager' ||
        user.role === 'TeamLead' ||
        user.isDepartmentLead === true);
};
var isOwnerOrManager = function (user) {
    return user.role === 'Owner' || user.role === 'Manager';
};
var hasCrossDepartmentAccess = function (user) {
    return user.canAssignAcrossDepartments === true;
};
var isSameDepartment = function (userDepartment, incidentDepartment) {
    return (0, IncidentDepartmentRules_1.normalizeDepartment)(userDepartment) === (0, IncidentDepartmentRules_1.normalizeDepartment)(incidentDepartment);
};
var getSeverity = function (incident) {
    return (0, IncidentDepartmentRules_1.normalizeIncidentSeverity)(incident.severity);
};
var isAssignedToUser = function (user, incident) {
    return Boolean(user.id && incident.assignedToId === user.id);
};
var canViewIncident = function (user, incident) {
    if (!(user === null || user === void 0 ? void 0 : user.id))
        return false;
    if (isAssignedToUser(user, incident))
        return true;
    if (hasCrossDepartmentAccess(user))
        return true;
    var severity = getSeverity(incident);
    var sameDepartment = isSameDepartment(user.department, incident.department);
    if (!sameDepartment)
        return false;
    if (severity === 'P1') {
        return isManagerOrLead(user);
    }
    if (severity === 'P2' || severity === 'P3' || severity === 'P4') {
        return true;
    }
    return false;
};
exports.canViewIncident = canViewIncident;
var canAssignIncident = function (user, incident, targetUser) {
    if (!(user === null || user === void 0 ? void 0 : user.id))
        return false;
    if (user.canAssign !== true)
        return false;
    if (!(targetUser === null || targetUser === void 0 ? void 0 : targetUser.id))
        return false;
    if (targetUser.id === user.id) {
        return (0, exports.canClaimIncident)(user, incident);
    }
    var incidentDepartment = (0, IncidentDepartmentRules_1.normalizeDepartment)(incident.department);
    var actorDepartment = (0, IncidentDepartmentRules_1.normalizeDepartment)(user.department);
    var targetDepartment = targetUser.department
        ? (0, IncidentDepartmentRules_1.normalizeDepartment)(targetUser.department)
        : undefined;
    var sameDepartmentAssignment = actorDepartment === incidentDepartment &&
        targetDepartment === incidentDepartment;
    if (sameDepartmentAssignment) {
        return isManagerOrLead(user) || user.role === 'Owner';
    }
    return hasCrossDepartmentAccess(user) && isOwnerOrManager(user);
};
exports.canAssignIncident = canAssignIncident;
var canClaimIncident = function (user, incident) {
    if (!(user === null || user === void 0 ? void 0 : user.id))
        return false;
    if (incident.assignedToId && incident.assignedToId !== user.id) {
        return false;
    }
    if (hasCrossDepartmentAccess(user))
        return true;
    var severity = getSeverity(incident);
    var sameDepartment = isSameDepartment(user.department, incident.department);
    if (!sameDepartment)
        return false;
    if (severity === 'P1') {
        return isManagerOrLead(user);
    }
    if (severity === 'P2' || severity === 'P3' || severity === 'P4') {
        return true;
    }
    return false;
};
exports.canClaimIncident = canClaimIncident;
var canCreateIncident = function (user, department) {
    if (!(user === null || user === void 0 ? void 0 : user.id))
        return false;
    if (!department)
        return false;
    return (0, IncidentDepartmentRules_1.isDepartmentSupported)(department);
};
exports.canCreateIncident = canCreateIncident;
var canEditIncident = function (user, incident) {
    if (!(user === null || user === void 0 ? void 0 : user.id))
        return false;
    if (isAssignedToUser(user, incident))
        return true;
    if (hasCrossDepartmentAccess(user))
        return true;
    return isSameDepartment(user.department, incident.department) && isManagerOrLead(user);
};
exports.canEditIncident = canEditIncident;
var requiresSite = function (incident) {
    var department = (0, IncidentDepartmentRules_1.normalizeDepartment)(incident.department);
    if ((0, IncidentDepartmentRules_1.requiresSiteForDepartment)(department)) {
        return true;
    }
    var catalogEntry = (0, IncidentCatalog_1.findIncidentCatalogEntry)(department, incident.incidentTypeTitle);
    return (catalogEntry === null || catalogEntry === void 0 ? void 0 : catalogEntry.requiresSite) === true;
};
exports.requiresSite = requiresSite;
exports.IncidentPolicy = {
    canViewIncident: exports.canViewIncident,
    canAssignIncident: exports.canAssignIncident,
    canClaimIncident: exports.canClaimIncident,
    canCreateIncident: exports.canCreateIncident,
    canEditIncident: exports.canEditIncident,
    requiresSite: exports.requiresSite,
};
//# sourceMappingURL=IncidentPolicy.js.map