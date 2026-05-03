"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildIncidentSla = exports.getPriorityFromSeverity = void 0;
var INCIDENT_SLA_MAP = {
    P1: { responseMinutes: 15, resolutionMinutes: 60 },
    P2: { responseMinutes: 60, resolutionMinutes: 240 },
    P3: { responseMinutes: 240, resolutionMinutes: 1440 },
    P4: { responseMinutes: 1440, resolutionMinutes: 4320 },
};
var getPriorityFromSeverity = function (severity) {
    switch (severity) {
        case 'P1':
            return 'Critical';
        case 'P2':
            return 'High';
        case 'P3':
            return 'Medium';
        case 'P4':
        default:
            return 'Low';
    }
};
exports.getPriorityFromSeverity = getPriorityFromSeverity;
var buildIncidentSla = function (severity, now) {
    if (now === void 0) { now = new Date(); }
    var definition = INCIDENT_SLA_MAP[severity];
    var responseDueDate = new Date(now.getTime() + definition.responseMinutes * 60 * 1000);
    var resolutionDueDate = new Date(now.getTime() + definition.resolutionMinutes * 60 * 1000);
    return {
        responseMinutes: definition.responseMinutes,
        resolutionMinutes: definition.resolutionMinutes,
        responseDueDate: responseDueDate.toISOString(),
        resolutionDueDate: resolutionDueDate.toISOString(),
        deadline: resolutionDueDate.toISOString(),
        status: 'OnTrack',
    };
};
exports.buildIncidentSla = buildIncidentSla;
//# sourceMappingURL=incidentSla.js.map