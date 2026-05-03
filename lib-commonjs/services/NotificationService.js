"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
var tslib_1 = require("tslib");
// NotificationService.ts
var sp_http_1 = require("@microsoft/sp-http");
var NotificationService = /** @class */ (function () {
    function NotificationService(context) {
        this.context = context;
    }
    /**
     * Sends an email via Microsoft Graph.
     * Requires Mail.Send permission (delegated or application).
     */
    NotificationService.prototype.sendEmail = function (toRecipients, subject, bodyHtml, ccRecipients) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var client, message;
            var _a;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.context.aadHttpClientFactory.getClient('https://graph.microsoft.com')];
                    case 1:
                        client = _b.sent();
                        message = {
                            message: {
                                subject: subject,
                                body: {
                                    contentType: 'HTML',
                                    content: bodyHtml,
                                },
                                toRecipients: toRecipients.map(function (email) { return ({
                                    emailAddress: { address: email },
                                }); }),
                                ccRecipients: (_a = ccRecipients === null || ccRecipients === void 0 ? void 0 : ccRecipients.map(function (email) { return ({
                                    emailAddress: { address: email },
                                }); })) !== null && _a !== void 0 ? _a : [],
                            },
                            saveToSentItems: 'false',
                        };
                        return [4 /*yield*/, client.post('https://graph.microsoft.com/v1.0/me/sendMail', sp_http_1.AadHttpClient.configurations.v1, {
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(message),
                            })];
                    case 2:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Sends a notification for an SLA escalation event.
     */
    NotificationService.prototype.sendEscalationNotification = function (params) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var subject, body;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        subject = "\uD83D\uDEA8 SLA Breached: ".concat(params.incidentTitle, " (ID ").concat(params.incidentId, ")");
                        body = "\n            <h3>Incident Escalation</h3>\n            <p><strong>Incident:</strong> ".concat(params.incidentTitle, "</p>\n            <p><strong>Department:</strong> ").concat(params.department, "</p>\n            <p><strong>Previous Assignee:</strong> ").concat(params.oldAssignee, "</p>\n            <p><strong>Escalated To:</strong> ").concat(params.escalatedToName, "</p>\n            <p>This incident has breached its SLA and has been re\u2011assigned to you for immediate action.</p>\n            <p><a href=\"https://skyfi.sharepoint.com/sites/Helpdesk/Lists/WorkItems/DispForm.aspx?ID=").concat(params.incidentId, "\">View Incident</a></p>\n        ");
                        return [4 /*yield*/, this.sendEmail([params.escalatedToEmail], subject, body, params.managerEmail ? [params.managerEmail] : [])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return NotificationService;
}());
exports.NotificationService = NotificationService;
//# sourceMappingURL=NotificationService.js.map