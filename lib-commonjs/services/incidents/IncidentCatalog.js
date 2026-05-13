"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isIncidentTitleAllowedForDepartment = exports.findIncidentCatalogEntry = exports.getIncidentCatalogForDepartment = exports.INCIDENT_CATALOG = void 0;
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
        { title: 'Internal systems down', severity: 'P1' },
        { title: 'Slow internet', severity: 'P2' },
        { title: 'Phones not working', severity: 'P1' },
        { title: 'Hardware issues', severity: 'P3' },
        { title: 'Set up laptop for new employee', severity: 'P2' },
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
var normalizeText = function (value) {
    return (value !== null && value !== void 0 ? value : '').trim().toLowerCase();
};
var getIncidentCatalogForDepartment = function (department) {
    return exports.INCIDENT_CATALOG[department];
};
exports.getIncidentCatalogForDepartment = getIncidentCatalogForDepartment;
var findIncidentCatalogEntry = function (department, title) {
    var _a;
    var normalizedTitle = normalizeText(title);
    if (!normalizedTitle)
        return null;
    return (_a = exports.INCIDENT_CATALOG[department].find(function (item) { return normalizeText(item.title) === normalizedTitle; })) !== null && _a !== void 0 ? _a : null;
};
exports.findIncidentCatalogEntry = findIncidentCatalogEntry;
var isIncidentTitleAllowedForDepartment = function (department, title) {
    return (0, exports.findIncidentCatalogEntry)(department, title) !== null;
};
exports.isIncidentTitleAllowedForDepartment = isIncidentTitleAllowedForDepartment;
//# sourceMappingURL=IncidentCatalog.js.map