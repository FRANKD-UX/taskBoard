"use strict";
// CollaboratorService.ts
//
// Owns all reads and writes against the TaskCollaborators SharePoint list.
// Nothing in this file knows about React — it is pure data access logic.
//
// The TaskCollaborators list schema (create this in SharePoint):
//   Title          - Single line  (label, e.g. "Task 42 - John Smith")
//   TaskId         - Number       (SP item ID of the task)
//   TaskTitle      - Single line  (denormalised task title for emails)
//   RequestedBy    - Person
//   Collaborator   - Person
//   Status         - Choice       (Pending | Accepted | Declined), default Pending
//   RequestedAt    - Date/Time
//   RespondedAt    - Date/Time    (blank until they respond)
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaboratorService = void 0;
var tslib_1 = require("tslib");
var pnpjsConfig_1 = require("../pnpjsConfig");
var LIST_TITLE = 'TaskCollaborators';
var mapPersonField = function (field) {
    var _a, _b, _c, _d, _e;
    return ({
        id: (_a = field === null || field === void 0 ? void 0 : field.Id) !== null && _a !== void 0 ? _a : null,
        name: (_b = field === null || field === void 0 ? void 0 : field.Title) !== null && _b !== void 0 ? _b : '',
        email: (_d = (_c = field === null || field === void 0 ? void 0 : field.EMail) !== null && _c !== void 0 ? _c : field === null || field === void 0 ? void 0 : field.Email) !== null && _d !== void 0 ? _d : '',
        loginName: (_e = field === null || field === void 0 ? void 0 : field.LoginName) !== null && _e !== void 0 ? _e : '',
    });
};
var mapRequestItem = function (item) {
    var _a, _b, _c, _d, _e;
    return ({
        requestId: item.Id,
        taskId: (_a = item.TaskId) !== null && _a !== void 0 ? _a : 0,
        taskTitle: (_b = item.TaskTitle) !== null && _b !== void 0 ? _b : '',
        collaborator: mapPersonField(item.Collaborator),
        requestedBy: mapPersonField(item.RequestedBy),
        status: ((_c = item.Status) !== null && _c !== void 0 ? _c : 'Pending'),
        requestedAt: (_d = item.RequestedAt) !== null && _d !== void 0 ? _d : '',
        respondedAt: (_e = item.RespondedAt) !== null && _e !== void 0 ? _e : undefined,
    });
};
var CollaboratorService = /** @class */ (function () {
    function CollaboratorService() {
    }
    CollaboratorService.prototype.getRequestsForTask = function (taskId) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, items, error_1;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(LIST_TITLE)
                                .items
                                .select('Id', 'Title', 'TaskId', 'TaskTitle', 'Status', 'RequestedAt', 'RespondedAt', 'RequestedBy/Id', 'RequestedBy/Title', 'RequestedBy/EMail', 'RequestedBy/LoginName', 'Collaborator/Id', 'Collaborator/Title', 'Collaborator/EMail', 'Collaborator/LoginName')
                                .expand('RequestedBy', 'Collaborator')
                                .filter("TaskId eq ".concat(taskId))
                                .orderBy('RequestedAt', false)
                                .top(100)()];
                    case 2:
                        items = _a.sent();
                        return [2 /*return*/, items.map(mapRequestItem)];
                    case 3:
                        error_1 = _a.sent();
                        console.error('CollaboratorService.getRequestsForTask failed', error_1);
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    CollaboratorService.prototype.getAcceptedCollaborators = function (taskId) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var requests;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getRequestsForTask(taskId)];
                    case 1:
                        requests = _a.sent();
                        return [2 /*return*/, requests
                                .filter(function (r) { return r.status === 'Accepted'; })
                                .map(function (r) { return r.collaborator; })];
                }
            });
        });
    };
    CollaboratorService.prototype.createRequest = function (params) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, taskId, taskTitle, collaboratorId, requestedById, payload, result, raw, createdId, created;
            var _a, _b, _c, _d, _e, _f;
            return tslib_1.__generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        taskId = params.taskId, taskTitle = params.taskTitle, collaboratorId = params.collaboratorId, requestedById = params.requestedById;
                        payload = {
                            // Title is required by SP — we build a readable label.
                            Title: "Task ".concat(taskId, " collaboration request"),
                            TaskId: taskId,
                            TaskTitle: taskTitle,
                            // Person fields in SP REST use the Id-suffixed column name.
                            CollaboratorId: collaboratorId,
                            RequestedById: requestedById,
                            Status: 'Pending',
                            RequestedAt: new Date().toISOString(),
                        };
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(LIST_TITLE)
                                .items.add(payload)];
                    case 1:
                        result = _g.sent();
                        raw = result;
                        createdId = (_f = (_e = (_d = (_b = (_a = raw === null || raw === void 0 ? void 0 : raw.data) === null || _a === void 0 ? void 0 : _a.Id) !== null && _b !== void 0 ? _b : (_c = raw === null || raw === void 0 ? void 0 : raw.data) === null || _c === void 0 ? void 0 : _c.ID) !== null && _d !== void 0 ? _d : raw === null || raw === void 0 ? void 0 : raw.Id) !== null && _e !== void 0 ? _e : raw === null || raw === void 0 ? void 0 : raw.ID) !== null && _f !== void 0 ? _f : 0;
                        if (!(createdId > 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.getRequestById(createdId)];
                    case 2:
                        created = _g.sent();
                        if (created)
                            return [2 /*return*/, created];
                        _g.label = 3;
                    case 3: 
                    // Fallback — return a synthetic object so the UI can still update
                    // optimistically even if the re-fetch fails.
                    return [2 /*return*/, {
                            requestId: createdId,
                            taskId: taskId,
                            taskTitle: taskTitle,
                            collaborator: { id: collaboratorId, name: '', email: '', loginName: '' },
                            requestedBy: { id: requestedById, name: '', email: '', loginName: '' },
                            status: 'Pending',
                            requestedAt: new Date().toISOString(),
                        }];
                }
            });
        });
    };
    CollaboratorService.prototype.getRequestById = function (requestId) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, item, error_2;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(LIST_TITLE)
                                .items.getById(requestId)
                                .select('Id', 'Title', 'TaskId', 'TaskTitle', 'Status', 'RequestedAt', 'RespondedAt', 'RequestedBy/Id', 'RequestedBy/Title', 'RequestedBy/EMail', 'RequestedBy/LoginName', 'Collaborator/Id', 'Collaborator/Title', 'Collaborator/EMail', 'Collaborator/LoginName')
                                .expand('RequestedBy', 'Collaborator')()];
                    case 2:
                        item = _a.sent();
                        return [2 /*return*/, mapRequestItem(item)];
                    case 3:
                        error_2 = _a.sent();
                        console.error('CollaboratorService.getRequestById failed', error_2);
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    CollaboratorService.prototype.cancelRequest = function (requestId) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(LIST_TITLE)
                                .items.getById(requestId)
                                .delete()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    CollaboratorService.prototype.pendingRequestExists = function (taskId, collaboratorId) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, items, _a;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(LIST_TITLE)
                                .items
                                .select('Id')
                                .filter("TaskId eq ".concat(taskId, " and CollaboratorId eq ").concat(collaboratorId, " and Status eq 'Pending'"))
                                .top(1)()];
                    case 2:
                        items = _b.sent();
                        return [2 /*return*/, items.length > 0];
                    case 3:
                        _a = _b.sent();
                        // If the check fails, let the create attempt proceed —
                        // SP will handle any list-level constraints.
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // -----------------------------------------------------------------------
    // Update the Collaborators multi-person field on the Tasks list after
    // a request is accepted via Power Automate.
    //
    // Power Automate handles this automatically via the flow, but we expose
    // this method so you can call it manually from the UI if you ever add
    // an in-app Accept flow later.
    // -----------------------------------------------------------------------
    CollaboratorService.prototype.addCollaboratorToTask = function (taskListTitle, taskSpId, collaboratorSpId) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, item, raw, existing, updated;
            var _a, _b, _c;
            return tslib_1.__generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(taskListTitle)
                                .items.getById(taskSpId)
                                .select('CollaboratorsId')()];
                    case 1:
                        item = _d.sent();
                        raw = item;
                        existing = (_c = (_b = (_a = raw === null || raw === void 0 ? void 0 : raw.CollaboratorsId) === null || _a === void 0 ? void 0 : _a.results) !== null && _b !== void 0 ? _b : raw === null || raw === void 0 ? void 0 : raw.CollaboratorsId) !== null && _c !== void 0 ? _c : [];
                        // Only add if not already present.
                        if (existing.indexOf(collaboratorSpId) > -1)
                            return [2 /*return*/];
                        updated = tslib_1.__spreadArray(tslib_1.__spreadArray([], existing, true), [collaboratorSpId], false);
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(taskListTitle)
                                .items.getById(taskSpId)
                                .update({ CollaboratorsId: { results: updated } })];
                    case 2:
                        _d.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return CollaboratorService;
}());
exports.CollaboratorService = CollaboratorService;
//# sourceMappingURL=CollaboratorService.js.map