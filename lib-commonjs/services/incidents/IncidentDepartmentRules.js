"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureValidSeverity = exports.ensureValidDepartment = exports.requiresSiteForDepartment = exports.normalizeIncidentSeverity = exports.isTaskDepartment = exports.requiresSite = exports.getDepartmentRule = exports.normalizeDepartment = exports.isDepartmentSupported = exports.DEPARTMENT_RULES = exports.ALLOWED_TASK_DEPARTMENTS = void 0;
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
exports.DEPARTMENT_RULES = {
    Support: {
        requiresSite: false,
        allowCrossDepartmentAssignment: false,
    },
    IT: {
        requiresSite: true,
        allowCrossDepartmentAssignment: false,
    },
    Accounts: {
        requiresSite: false,
        allowCrossDepartmentAssignment: false,
    },
    Operations: {
        requiresSite: false,
        allowCrossDepartmentAssignment: false,
    },
    Complaints: {
        requiresSite: false,
        allowCrossDepartmentAssignment: false,
    },
};
var isDepartmentSupported = function (department) {
    if (!department)
        return false;
    var normalized = department.toLowerCase().trim();
    return Boolean(DEPARTMENT_ALIAS_MAP[normalized]);
};
exports.isDepartmentSupported = isDepartmentSupported;
var normalizeDepartment = function (department) {
    if (!department)
        return 'Support';
    var normalized = department.toLowerCase().trim();
    var mapped = DEPARTMENT_ALIAS_MAP[normalized];
    return mapped !== null && mapped !== void 0 ? mapped : 'Support';
};
exports.normalizeDepartment = normalizeDepartment;
var getDepartmentRule = function (department) {
    return exports.DEPARTMENT_RULES[(0, exports.normalizeDepartment)(department)];
};
exports.getDepartmentRule = getDepartmentRule;
var requiresSite = function (department) {
    return (0, exports.getDepartmentRule)(department).requiresSite;
};
exports.requiresSite = requiresSite;
var isTaskDepartment = function (department) {
    return (0, exports.isDepartmentSupported)(department);
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
    return (0, exports.requiresSite)(department);
};
exports.requiresSiteForDepartment = requiresSiteForDepartment;
var ensureValidDepartment = function (department) {
    if (!(0, exports.isDepartmentSupported)(department)) {
        throw new Error("Invalid department: ".concat(department !== null && department !== void 0 ? department : 'unknown'));
    }
    return (0, exports.normalizeDepartment)(department);
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