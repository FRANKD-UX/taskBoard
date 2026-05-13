"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentAssignmentService = void 0;
var IncidentPolicy_1 = require("./IncidentPolicy");
exports.IncidentAssignmentService = {
    canAssignIncident: function (user, incident, targetUser) {
        var _a, _b;
        return (0, IncidentPolicy_1.canAssignIncident)(user, {
            department: incident.department,
            severity: incident.severity,
            assignedToId: (_a = incident.assignedToId) !== null && _a !== void 0 ? _a : null,
            incidentTypeTitle: (_b = incident.incidentType) === null || _b === void 0 ? void 0 : _b.title,
            site: incident.site,
        }, targetUser);
    },
    canClaimIncident: function (user, incident) {
        var _a, _b;
        return (0, IncidentPolicy_1.canClaimIncident)(user, {
            department: incident.department,
            severity: incident.severity,
            assignedToId: (_a = incident.assignedToId) !== null && _a !== void 0 ? _a : null,
            incidentTypeTitle: (_b = incident.incidentType) === null || _b === void 0 ? void 0 : _b.title,
            site: incident.site,
        });
    },
};
//# sourceMappingURL=IncidentAssignmentService.js.map