"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentPolicy = exports.requiresSite = exports.canEditIncident = exports.canCreateIncident = exports.canClaimIncident = exports.canAssignIncident = exports.canViewIncident = void 0;
var IncidentCatalog_1 = require("./IncidentCatalog");
var IncidentDepartmentRules_1 = require("./IncidentDepartmentRules");
var getUserId = function (user) {
    var _a, _b;
    return (_b = (_a = user.userId) !== null && _a !== void 0 ? _a : user.id) !== null && _b !== void 0 ? _b : null;
};
var isManagerOrLead = function (user) {
    return user.role === 'Manager' || user.role === 'TeamLead' || user.isDepartmentLead === true;
};
var isOwnerOrManager = function (user) {
    return user.role === 'Owner' || user.role === 'Manager';
};
var hasCrossDepartmentAssignmentPermission = function (user) {
    if (user.canAssignAcrossDepartments !== true)
        return false;
    return isOwnerOrManager(user);
};
var isSameDepartment = function (userDepartment, incidentDepartment) {
    return (0, IncidentDepartmentRules_1.normalizeDepartment)(userDepartment) === (0, IncidentDepartmentRules_1.normalizeDepartment)(incidentDepartment);
};
var getSeverity = function (incident) {
    return (0, IncidentDepartmentRules_1.normalizeIncidentSeverity)(incident.severity);
};
var isCreator = function (user, incident) {
    var _a, _b;
    var actorId = getUserId(user);
    var actorEmail = (_a = user.email) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
    var incidentCreatorEmail = (_b = incident.createdByEmail) === null || _b === void 0 ? void 0 : _b.trim().toLowerCase();
    if (actorId !== null && incident.authorId !== undefined && incident.authorId !== null) {
        return incident.authorId === actorId;
    }
    if (actorEmail && incidentCreatorEmail) {
        return actorEmail === incidentCreatorEmail;
    }
    return false;
};
var canViewIncident = function (user, incident) {
    var actorId = getUserId(user);
    if (actorId === null)
        return false;
    if (incident.assignedToId === actorId)
        return true;
    var severity = getSeverity(incident);
    var sameDepartment = isSameDepartment(user.department, incident.department);
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
exports.canViewIncident = canViewIncident;
var canAssignIncident = function (user, incident, targetUser) {
    var actorId = getUserId(user);
    if (actorId === null || user.canAssign !== true)
        return false;
    if (!targetUser || targetUser.id === null)
        return false;
    if (targetUser.id === actorId) {
        return (0, exports.canClaimIncident)(user, incident);
    }
    var incidentDepartment = (0, IncidentDepartmentRules_1.normalizeDepartment)(incident.department);
    var actorDepartment = (0, IncidentDepartmentRules_1.normalizeDepartment)(user.department);
    var targetDepartment = targetUser.department
        ? (0, IncidentDepartmentRules_1.normalizeDepartment)(targetUser.department)
        : incidentDepartment;
    var sameDepartmentAssignment = actorDepartment === incidentDepartment && targetDepartment === incidentDepartment;
    if (sameDepartmentAssignment) {
        return user.role === 'Owner' || isManagerOrLead(user);
    }
    return hasCrossDepartmentAssignmentPermission(user);
};
exports.canAssignIncident = canAssignIncident;
var canClaimIncident = function (user, incident) {
    var actorId = getUserId(user);
    if (actorId === null)
        return false;
    if (incident.assignedToId !== undefined && incident.assignedToId !== null && incident.assignedToId !== actorId) {
        return false;
    }
    if (isSameDepartment(user.department, incident.department)) {
        return true;
    }
    return hasCrossDepartmentAssignmentPermission(user);
};
exports.canClaimIncident = canClaimIncident;
var canCreateIncident = function (user, department, _incidentTypeTitle) {
    var actorId = getUserId(user);
    if (actorId === null || !department)
        return false;
    if (isSameDepartment(user.department, department))
        return true;
    return hasCrossDepartmentAssignmentPermission(user);
};
exports.canCreateIncident = canCreateIncident;
var canEditIncident = function (user, incident) {
    var actorId = getUserId(user);
    if (actorId === null)
        return false;
    if (incident.assignedToId === actorId)
        return true;
    var isUnassigned = incident.assignedToId === undefined || incident.assignedToId === null;
    if (isUnassigned && isCreator(user, incident))
        return true;
    return isSameDepartment(user.department, incident.department) && isManagerOrLead(user);
};
exports.canEditIncident = canEditIncident;
var resolveDepartmentFromInput = function (input) {
    if (!input)
        return null;
    if (typeof input === 'string') {
        if (!(0, IncidentDepartmentRules_1.isDepartmentSupported)(input))
            return null;
        return (0, IncidentDepartmentRules_1.normalizeDepartment)(input);
    }
    if (typeof input === 'object') {
        return (0, IncidentDepartmentRules_1.normalizeDepartment)(input.department);
    }
    return null;
};
var requiresSite = function (input) {
    var department = resolveDepartmentFromInput(input);
    if (!department)
        return false;
    if ((0, IncidentDepartmentRules_1.requiresSite)(department)) {
        return true;
    }
    if (typeof input === 'object' && (input === null || input === void 0 ? void 0 : input.incidentTypeTitle)) {
        var catalogEntry = (0, IncidentCatalog_1.findIncidentCatalogEntry)(department, input.incidentTypeTitle);
        if ((catalogEntry === null || catalogEntry === void 0 ? void 0 : catalogEntry.requiresSite) === true) {
            return true;
        }
    }
    return (0, IncidentDepartmentRules_1.getDepartmentRule)(department).requiresSite;
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