"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentVisibilityService = void 0;
var IncidentPolicy_1 = require("./IncidentPolicy");
exports.IncidentVisibilityService = {
    canViewIncident: function (user, incident) {
        var _a, _b, _c;
        return (0, IncidentPolicy_1.canViewIncident)(user, {
            department: incident.department,
            severity: incident.severity,
            assignedToId: (_a = incident.assignedToId) !== null && _a !== void 0 ? _a : null,
            incidentTypeTitle: (_b = incident.incidentType) === null || _b === void 0 ? void 0 : _b.title,
            authorId: (_c = incident.authorId) !== null && _c !== void 0 ? _c : null,
        });
    },
    filterVisibleIncidents: function (incidents, user) {
        var _this = this;
        return incidents.filter(function (incident) { return _this.canViewIncident(user, incident); });
    },
};
//# sourceMappingURL=IncidentVisibilityService.js.map