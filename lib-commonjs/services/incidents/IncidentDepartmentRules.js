"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureValidSeverity = exports.ensureValidDepartment = exports.normalizeIncidentSeverity = exports.requiresSiteForDepartment = exports.requiresSite = exports.getDepartmentRule = exports.isTaskDepartment = exports.isDepartmentSupported = exports.normalizeDepartment = exports.DEPARTMENT_RULES = exports.ALLOWED_TASK_DEPARTMENTS = void 0;
exports.ALLOWED_TASK_DEPARTMENTS = [
    'Support',
    'IT',
    'Accounts',
    'Operations',
    'Complaints',
];
exports.DEPARTMENT_RULES = {
    Support: {
        department: 'Support',
        requiresSite: false,
    },
    IT: {
        department: 'IT',
        requiresSite: true,
    },
    Accounts: {
        department: 'Accounts',
        requiresSite: false,
    },
    Operations: {
        department: 'Operations',
        requiresSite: false,
    },
    Complaints: {
        department: 'Complaints',
        requiresSite: false,
    },
};
var DEPARTMENT_ALIAS_MAP = {
    support: 'Support',
    it: 'IT',
    accounts: 'Accounts',
    finance: 'Accounts',
    operations: 'Operations',
    complaints: 'Complaints',
};
var VALID_INCIDENT_SEVERITIES = [
    'P1',
    'P2',
    'P3',
    'P4',
];
var normalizeDepartment = function (department) {
    var _a;
    var normalized = (department !== null && department !== void 0 ? department : '').toLowerCase().trim();
    return (_a = DEPARTMENT_ALIAS_MAP[normalized]) !== null && _a !== void 0 ? _a : 'Support';
};
exports.normalizeDepartment = normalizeDepartment;
var isDepartmentSupported = function (department) {
    if (!department)
        return false;
    var normalized = (department !== null && department !== void 0 ? department : '').toLowerCase().trim();
    return DEPARTMENT_ALIAS_MAP[normalized] !== undefined;
};
exports.isDepartmentSupported = isDepartmentSupported;
exports.isTaskDepartment = exports.isDepartmentSupported;
var getDepartmentRule = function (department) {
    var normalizedDepartment = (0, exports.normalizeDepartment)(department);
    return exports.DEPARTMENT_RULES[normalizedDepartment];
};
exports.getDepartmentRule = getDepartmentRule;
var requiresSite = function (department) {
    return (0, exports.getDepartmentRule)(department).requiresSite;
};
exports.requiresSite = requiresSite;
var requiresSiteForDepartment = function (department) {
    return exports.DEPARTMENT_RULES[department].requiresSite;
};
exports.requiresSiteForDepartment = requiresSiteForDepartment;
var normalizeIncidentSeverity = function (severity) {
    if (!severity)
        return null;
    var normalized = severity.toUpperCase().trim();
    return VALID_INCIDENT_SEVERITIES.includes(normalized)
        ? normalized
        : null;
};
exports.normalizeIncidentSeverity = normalizeIncidentSeverity;
var ensureValidDepartment = function (department) {
    if (!(0, exports.isDepartmentSupported)(department)) {
        throw new Error("Invalid department: ".concat(department !== null && department !== void 0 ? department : 'unknown'));
    }
    return (0, exports.normalizeDepartment)(department);
};
exports.ensureValidDepartment = ensureValidDepartment;
var ensureValidSeverity = function (severity) {
    var normalizedSeverity = (0, exports.normalizeIncidentSeverity)(severity);
    if (!normalizedSeverity) {
        throw new Error("Invalid incident severity: ".concat(severity !== null && severity !== void 0 ? severity : 'unknown'));
    }
    return normalizedSeverity;
};
exports.ensureValidSeverity = ensureValidSeverity;
//# sourceMappingURL=IncidentDepartmentRules.js.map