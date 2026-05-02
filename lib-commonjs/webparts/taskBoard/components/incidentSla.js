"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildIncidentSla = void 0;
var INCIDENT_SLA_MAP = {
    P1: { responseMinutes: 15, resolutionMinutes: 120 },
    P2: { responseMinutes: 30, resolutionMinutes: 240 },
    P3: { responseMinutes: 120, resolutionMinutes: 1440 },
    P4: { responseMinutes: 240, resolutionMinutes: 2880 },
};
var buildIncidentSla = function (severity, now) {
    if (now === void 0) { now = new Date(); }
    var definition = INCIDENT_SLA_MAP[severity];
    var deadline = new Date(now.getTime() + definition.resolutionMinutes * 60 * 1000);
    return {
        responseMinutes: definition.responseMinutes,
        resolutionMinutes: definition.resolutionMinutes,
        deadline: deadline.toISOString(),
        status: 'OnTrack',
    };
};
exports.buildIncidentSla = buildIncidentSla;
//# sourceMappingURL=incidentSla.js.map