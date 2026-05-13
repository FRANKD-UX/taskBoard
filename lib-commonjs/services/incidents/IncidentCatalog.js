"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isIncidentTitleAllowedForDepartment = exports.findIncidentCatalogEntry = exports.INCIDENT_CATALOG = void 0;
var IncidentDepartmentRules_1 = require("./IncidentDepartmentRules");
exports.INCIDENT_CATALOG = {
    Support: [
        { title: 'Misdirected client', severity: 'P4' },
        { title: 'Incomplete escalation', severity: 'P1' },
        { title: 'Maintenance update', severity: 'P1' },
        { title: 'Complaints update', severity: 'P2' },
        { title: 'Tech request update', severity: 'P1' },
        { title: 'VIP client is down', severity: 'P1' },
    ],
    IT: [
        { title: 'No internet on site', severity: 'P1', requiresSite: true },
        { title: 'Internal systems down', severity: 'P1', requiresSite: true },
        { title: 'Slow internet', severity: 'P2', requiresSite: true },
        { title: 'Phones not working', severity: 'P1', requiresSite: true },
        { title: 'Hardware issues', severity: 'P3', requiresSite: true },
        { title: 'Set up laptop for new employee', severity: 'P2', requiresSite: true },
    ],
    Accounts: [
        { title: "PPP's", severity: 'P1' },
        { title: 'Payment allocation', severity: 'P3' },
        { title: 'Payment arrangements', severity: 'P4' },
        { title: 'Update clients details', severity: 'P3' },
    ],
    Operations: [
        { title: 'Tech request', severity: 'P1' },
    ],
    Complaints: [],
};
var findIncidentCatalogEntry = function (department, title) {
    var _a;
    if (!department || !title)
        return null;
    var normalizedDepartment = (0, IncidentDepartmentRules_1.normalizeDepartment)(department);
    var normalizedTitle = title.trim().toLowerCase();
    return (_a = exports.INCIDENT_CATALOG[normalizedDepartment].find(function (item) { return item.title.trim().toLowerCase() === normalizedTitle; })) !== null && _a !== void 0 ? _a : null;
};
exports.findIncidentCatalogEntry = findIncidentCatalogEntry;
var isIncidentTitleAllowedForDepartment = function (department, title) {
    if (!department || !title)
        return false;
    return Boolean((0, exports.findIncidentCatalogEntry)(department, title));
};
exports.isIncidentTitleAllowedForDepartment = isIncidentTitleAllowedForDepartment;
//# sourceMappingURL=IncidentCatalog.js.map