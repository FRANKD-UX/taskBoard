"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureValidSeverity = exports.ensureValidDepartment = exports.requiresSiteForDepartment = exports.normalizeIncidentSeverity = exports.isTaskDepartment = exports.normalizeDepartment = exports.ALLOWED_TASK_DEPARTMENTS = void 0;
exports.ALLOWED_TASK_DEPARTMENTS = [
    'Support',
    'IT',
    'Accounts',
    'Operations',
    'Complaints',
];
var DEPARTMENT_ALIAS_MAP = {
    support: 'Support',
    it: 'IT',
    accounts: 'Accounts',
    finance: 'Accounts',
    operations: 'Operations',
    complaints: 'Complaints',
};
var VALID_INCIDENT_SEVERITIES = ['P1', 'P2', 'P3', 'P4'];
var normalizeDepartment = function (department) {
    var normalized = (department !== null && department !== void 0 ? department : '').toLowerCase().trim();
    var mapped = DEPARTMENT_ALIAS_MAP[normalized];
    return mapped !== null && mapped !== void 0 ? mapped : 'Support';
};
exports.normalizeDepartment = normalizeDepartment;
var isTaskDepartment = function (department) {
    if (!department)
        return false;
    var normalized = (department !== null && department !== void 0 ? department : '').toLowerCase().trim();
    return Boolean(DEPARTMENT_ALIAS_MAP[normalized]);
};
exports.isTaskDepartment = isTaskDepartment;
var normalizeIncidentSeverity = function (severity) {
    if (!severity)
        return null;
    var normalized = severity.toUpperCase().trim();
    return VALID_INCIDENT_SEVERITIES.includes(normalized)
        ? normalized
        : null;
};
exports.normalizeIncidentSeverity = normalizeIncidentSeverity;
var requiresSiteForDepartment = function (department) {
    return department === 'IT';
};
exports.requiresSiteForDepartment = requiresSiteForDepartment;
var ensureValidDepartment = function (department) {
    var raw = (department !== null && department !== void 0 ? department : '').toLowerCase().trim();
    var mapped = DEPARTMENT_ALIAS_MAP[raw];
    if (!mapped) {
        throw new Error("Invalid department: ".concat(department !== null && department !== void 0 ? department : 'unknown'));
    }
    return mapped;
};
exports.ensureValidDepartment = ensureValidDepartment;
var ensureValidSeverity = function (severity) {
    var normalized = (0, exports.normalizeIncidentSeverity)(severity);
    if (!normalized) {
        throw new Error("Invalid incident severity: ".concat(severity !== null && severity !== void 0 ? severity : 'unknown'));
    }
    return normalized;
};
exports.ensureValidSeverity = ensureValidSeverity;
//# sourceMappingURL=IncidentDepartmentRules.js.map