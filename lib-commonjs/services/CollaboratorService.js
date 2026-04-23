"use strict";
// CollaboratorService.ts
//
// Owns all reads and writes against the TaskCollaborators SharePoint list.
// Nothing in this file knows about React — it is pure data access logic.
//
// Confirmed SP column types on TaskCollaborators (do not change these):
//   RequestedBy  → User      (single-value) → write as plain number on RequestedById
//   Collaborator → UserMulti (multi-value)  → write as { results: [id] } on CollaboratorId
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaboratorService = void 0;
var tslib_1 = require("tslib");
var pnpjsConfig_1 = require("../pnpjsConfig");
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
var LIST_TITLE = 'TaskCollaborators';
var COLLABORATOR_FIELD_CANDIDATES = ['Collaborator', 'Collaborators'];
var REQUESTED_BY_FIELD_CANDIDATES = ['RequestedBy', 'Requested By', 'RequestedById'];
// ---------------------------------------------------------------------------
// Private pure helpers
// ---------------------------------------------------------------------------
var normalizeFieldName = function (value) {
    return (value !== null && value !== void 0 ? value : '')
        .replace(/_x0020_/gi, '')
        .replace(/\s+/g, '')
        .toLowerCase();
};
var mapPersonField = function (field) {
    var _a, _b, _c, _d, _e;
    return ({
        id: (_a = field === null || field === void 0 ? void 0 : field.Id) !== null && _a !== void 0 ? _a : null,
        name: (_b = field === null || field === void 0 ? void 0 : field.Title) !== null && _b !== void 0 ? _b : '',
        email: (_d = (_c = field === null || field === void 0 ? void 0 : field.EMail) !== null && _c !== void 0 ? _c : field === null || field === void 0 ? void 0 : field.Email) !== null && _d !== void 0 ? _d : '',
        loginName: (_e = field === null || field === void 0 ? void 0 : field.Title) !== null && _e !== void 0 ? _e : '',
    });
};
var mapRequestItem = function (item) {
    var _a, _b, _c, _d;
    return ({
        requestId: item.Id,
        taskId: item.TaskId ? parseInt(item.TaskId, 10) : 0,
        taskTitle: (_a = item.TaskTitle) !== null && _a !== void 0 ? _a : '',
        collaborator: mapPersonField(item.Collaborator),
        requestedBy: mapPersonField(item.RequestedBy),
        status: ((_b = item.Status) !== null && _b !== void 0 ? _b : 'Pending'),
        requestedAt: (_c = item.RequestedAt) !== null && _c !== void 0 ? _c : '',
        respondedAt: (_d = item.RespondedAt) !== null && _d !== void 0 ? _d : undefined,
    });
};
var generateGuid = function () {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};
// Builds the correct write value for a Person field based on its actual SP type.
// UserMulti fields require { results: [id] }.
// Single-value User fields require a plain number on the Id-suffix field.
// Getting this wrong in either direction causes a 400 Bad Request.
var buildPersonPayload = function (userId, isMulti) {
    return isMulti ? [userId] : userId;
};
// ---------------------------------------------------------------------------
// CollaboratorServiceNew collaboration request: TitleYou have been added as a collaborator on a task.
// ---------------------------------------------------------------------------
var CollaboratorService = /** @class */ (function () {
    function CollaboratorService() {
    }
    // ---------------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------------
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
                                .select('Id', 'Title', 'TaskId', 'TaskTitle', 'Status', 'RequestedAt', 'RespondedAt', 'ResponseToken', 'RequestedBy/Id', 'RequestedBy/Title', 'RequestedBy/EMail', 'Collaborator/Id', 'Collaborator/Title', 'Collaborator/EMail')
                                .expand('RequestedBy', 'Collaborator')
                                .filter("TaskId eq '".concat(taskId, "'"))
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
            var taskId, taskTitle, collaboratorId, requestedById, siteAbsoluteUrl, fieldNames, responseToken, todayIso, payload, listApiUrl, contextInfoUrl, digestResponse, digestJson, requestDigest, addResponse, errorText, addedItem, createdId, created;
            var _a;
            var _b, _c, _d, _e, _f;
            return tslib_1.__generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        taskId = params.taskId, taskTitle = params.taskTitle, collaboratorId = params.collaboratorId, requestedById = params.requestedById, siteAbsoluteUrl = params.siteAbsoluteUrl;
                        return [4 /*yield*/, this.getFieldNames()];
                    case 1:
                        fieldNames = _g.sent();
                        responseToken = generateGuid();
                        todayIso = new Date().toISOString().split('T')[0];
                        payload = (_a = {
                                Title: "Task ".concat(taskId, " collaboration request"),
                                TaskId: String(taskId),
                                TaskTitle: taskTitle
                            },
                            _a[fieldNames.collaborator.idSuffixName] = buildPersonPayload(collaboratorId, fieldNames.collaborator.isMulti),
                            _a[fieldNames.requestedBy.idSuffixName] = buildPersonPayload(requestedById, fieldNames.requestedBy.isMulti),
                            _a.Status = 'Pending',
                            _a.RequestedAt = todayIso,
                            _a.ResponseToken = responseToken,
                            _a);
                        listApiUrl = "".concat(siteAbsoluteUrl, "/_api/web/lists/getByTitle('").concat(LIST_TITLE, "')/items");
                        contextInfoUrl = "".concat(siteAbsoluteUrl, "/_api/contextinfo");
                        return [4 /*yield*/, fetch(contextInfoUrl, {
                                method: 'POST',
                                headers: { Accept: 'application/json;odata=verbose' },
                                credentials: 'include',
                            })];
                    case 2:
                        digestResponse = _g.sent();
                        if (!digestResponse.ok) {
                            throw new Error("Failed to fetch SP request digest: ".concat(digestResponse.status, " ").concat(digestResponse.statusText));
                        }
                        return [4 /*yield*/, digestResponse.json()];
                    case 3:
                        digestJson = _g.sent();
                        requestDigest = (_d = (_c = (_b = digestJson === null || digestJson === void 0 ? void 0 : digestJson.d) === null || _b === void 0 ? void 0 : _b.GetContextWebInformation) === null || _c === void 0 ? void 0 : _c.FormDigestValue) !== null && _d !== void 0 ? _d : '';
                        return [4 /*yield*/, fetch(listApiUrl, {
                                method: 'POST',
                                headers: {
                                    Accept: 'application/json;odata=nometadata',
                                    'Content-Type': 'application/json;odata=nometadata',
                                    'X-RequestDigest': requestDigest,
                                },
                                credentials: 'include',
                                body: JSON.stringify(payload),
                            })];
                    case 4:
                        addResponse = _g.sent();
                        if (!!addResponse.ok) return [3 /*break*/, 6];
                        return [4 /*yield*/, addResponse.text()];
                    case 5:
                        errorText = _g.sent();
                        console.error('CollaboratorService.createRequest: SP rejected the payload\n', errorText);
                        throw new Error("SP returned ".concat(addResponse.status, ": ").concat(errorText));
                    case 6: return [4 /*yield*/, addResponse.json()];
                    case 7:
                        addedItem = _g.sent();
                        createdId = (_f = (_e = addedItem === null || addedItem === void 0 ? void 0 : addedItem.Id) !== null && _e !== void 0 ? _e : addedItem === null || addedItem === void 0 ? void 0 : addedItem.id) !== null && _f !== void 0 ? _f : 0;
                        if (!(createdId > 0)) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.getRequestById(createdId)];
                    case 8:
                        created = _g.sent();
                        if (created)
                            return [2 /*return*/, created];
                        _g.label = 9;
                    case 9: return [2 /*return*/, {
                            requestId: createdId,
                            taskId: taskId,
                            taskTitle: taskTitle,
                            collaborator: { id: collaboratorId, name: '', email: '', loginName: '' },
                            requestedBy: { id: requestedById, name: '', email: '', loginName: '' },
                            status: 'Pending',
                            requestedAt: todayIso,
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
                                .select('Id', 'Title', 'TaskId', 'TaskTitle', 'Status', 'RequestedAt', 'RespondedAt', 'ResponseToken', 'RequestedBy/Id', 'RequestedBy/Title', 'RequestedBy/EMail', 'Collaborator/Id', 'Collaborator/Title', 'Collaborator/EMail')
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
            var sp, fieldNames, items, _a;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, this.getFieldNames()];
                    case 2:
                        fieldNames = _b.sent();
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(LIST_TITLE)
                                .items
                                .select('Id')
                                .filter("TaskId eq '".concat(taskId, "' and ").concat(fieldNames.collaborator.idSuffixName, " eq ").concat(collaboratorId, " and Status eq 'Pending'"))
                                .top(1)()];
                    case 3:
                        items = _b.sent();
                        return [2 /*return*/, items.length > 0];
                    case 4:
                        _a = _b.sent();
                        return [2 /*return*/, false];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
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
                        if (existing.includes(collaboratorSpId))
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
    // ---------------------------------------------------------------------------
    // Private — field name and type discovery
    // ---------------------------------------------------------------------------
    CollaboratorService.prototype.getFieldNames = function () {
        if (!this.fieldNamesPromise) {
            this.fieldNamesPromise = this.resolveFieldNames();
        }
        return this.fieldNamesPromise;
    };
    CollaboratorService.prototype.resolveFieldNames = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, fields, error_3, resolve, result;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        fields = [];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(LIST_TITLE)
                                .fields
                                .select('InternalName', 'Title', 'TypeAsString', 'AllowMultipleValues')
                                .filter("TypeAsString eq 'User' or TypeAsString eq 'UserMulti'")()];
                    case 2:
                        // Fetch Person field schema so we know the exact internal names
                        // and whether each column is single-value User or multi-value UserMulti.
                        // This determines the correct write format on createRequest.
                        fields = _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        console.warn('CollaboratorService: could not load field schema, using default field names', error_3);
                        return [3 /*break*/, 4];
                    case 4:
                        resolve = function (candidates, fallbackInternalName, fallbackIsMulti) {
                            var _a;
                            var match = fields.find(function (field) {
                                var normalizedInternal = normalizeFieldName(field.InternalName);
                                var normalizedTitle = normalizeFieldName(field.Title);
                                return candidates.some(function (candidate) {
                                    var normalizedCandidate = normalizeFieldName(candidate);
                                    return (normalizedInternal === normalizedCandidate ||
                                        normalizedTitle === normalizedCandidate);
                                });
                            });
                            var internalName = (_a = match === null || match === void 0 ? void 0 : match.InternalName) !== null && _a !== void 0 ? _a : fallbackInternalName;
                            var isMulti = match !== undefined
                                ? match.TypeAsString === 'UserMulti' || match.AllowMultipleValues === true
                                : fallbackIsMulti;
                            return {
                                internalName: internalName,
                                idSuffixName: "".concat(internalName, "Id"),
                                isMulti: isMulti,
                            };
                        };
                        result = {
                            // Collaborator is UserMulti — confirmed by SP field schema inspection.
                            collaborator: resolve(COLLABORATOR_FIELD_CANDIDATES, 'Collaborator', true),
                            // RequestedBy is single-value User — confirmed by SP field schema inspection.
                            requestedBy: resolve(REQUESTED_BY_FIELD_CANDIDATES, 'RequestedBy', false),
                        };
                        console.info('CollaboratorService: resolved field names', result);
                        return [2 /*return*/, result];
                }
            });
        });
    };
    return CollaboratorService;
}());
exports.CollaboratorService = CollaboratorService;
//# sourceMappingURL=CollaboratorService.js.map