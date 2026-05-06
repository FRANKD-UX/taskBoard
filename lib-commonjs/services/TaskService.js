"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
var tslib_1 = require("tslib");
// TaskService.ts
require("@pnp/sp/fields");
var pnpjsConfig_1 = require("../pnpjsConfig");
var CollaboratorService_1 = require("./CollaboratorService");
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
var TASK_LIST_TITLE_CANDIDATES = ['WorkItems', 'Tasks', 'Task Management System'];
var ASSIGNEE_FIELD_CANDIDATES = ['AssignedTo', 'Assigned To', 'AssignedUser', 'Assigned User'];
var INCIDENT_TYPE_LIST_TITLE = 'IncidentTypes';
var INCIDENT_LOG_LIST_TITLE = 'IncidentLogs';
var USER_ROLE_LIST_TITLE = 'UserRoles';
var INCIDENT_TYPE_FIELD_CANDIDATES = ['IncidentType', 'Incident Type'];
var INCIDENT_LOG_WORKITEM_FIELD_CANDIDATES = ['WorkItemId', 'Work Item', 'WorkItem'];
var INCIDENT_LOG_ACTION_FIELD_CANDIDATES = ['Action'];
var INCIDENT_LOG_FIELDNAME_FIELD_CANDIDATES = ['FieldName', 'Field Name'];
var INCIDENT_LOG_OLDVALUE_FIELD_CANDIDATES = ['OldValue', 'Old Value'];
var INCIDENT_LOG_TIMESTAMP_FIELD_CANDIDATES = ['Timestamp'];
var INCIDENT_LOG_PERFORMEDBY_FIELD_CANDIDATES = ['PerformedBy', 'Performed By'];
var INCIDENT_LOG_NEWVALUE_FIELD_CANDIDATES = ['NewValue', 'New Value'];
// ---------------------------------------------------------------------------
// TaskService
// ---------------------------------------------------------------------------
var TaskService = /** @class */ (function () {
    function TaskService() {
    }
    TaskService.prototype.setNotificationService = function (service) {
        this.notificationService = service;
    };
    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------
    TaskService.prototype.getIncidentTypes = function () {
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
                                .getByTitle(INCIDENT_TYPE_LIST_TITLE)
                                .items.select('Id', 'Title', 'Severity', 'IsActive')
                                .filter('IsActive eq 1')
                                .orderBy('Title', true)()];
                    case 2:
                        items = _a.sent();
                        return [2 /*return*/, items
                                .filter(function (item) { return (item === null || item === void 0 ? void 0 : item.Title) && (item === null || item === void 0 ? void 0 : item.Severity); })
                                .map(function (item) { return ({
                                id: item.Id,
                                title: item.Title,
                                severity: item.Severity,
                                department: item.Department,
                                isActive: item.IsActive === true || item.IsActive === 1,
                            }); })];
                    case 3:
                        error_1 = _a.sent();
                        console.error('[TaskService] failed to load IncidentTypes:', error_1);
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    TaskService.prototype.getTasks = function (type) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, listTitle, assigneeField, incidentTypeFieldName, assigneeLookupField, mapItem, buildSelectAndExpand, _a, selectFields, expandFields, items, mappedItems_1, primaryError_1, _b, selectFields, expandFields, minimalSelect, minimalItems, mappedItems_2, minimalError_1, fallbackItems, mappedItems;
            var _c, _d, _e, _f;
            var _this = this;
            return tslib_1.__generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, this.getTaskListTitle()];
                    case 1:
                        listTitle = _g.sent();
                        return [4 /*yield*/, this.getAssigneeFieldConfig()];
                    case 2:
                        assigneeField = _g.sent();
                        return [4 /*yield*/, this.getIncidentTypeFieldName()];
                    case 3:
                        incidentTypeFieldName = _g.sent();
                        assigneeLookupField = "".concat(assigneeField.internalName, "Id");
                        mapItem = function (item) {
                            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                            var assignee = _this.getPrimaryAssignee((_a = item[assigneeField.internalName]) !== null && _a !== void 0 ? _a : item.AssignedTo);
                            var fallbackAssigneeId = _this.getPrimaryAssigneeId((_b = item[assigneeLookupField]) !== null && _b !== void 0 ? _b : item.AssignedToId);
                            var rawIncidentType = incidentTypeFieldName ? item[incidentTypeFieldName] : undefined;
                            var incidentType = _this.getIncidentTypeValue(rawIncidentType);
                            var requestType = _this.normalizeRequestType((_c = item.RequestType) !== null && _c !== void 0 ? _c : item.Type);
                            var workItemType = _this.toWorkItemType(requestType);
                            var authorId = (_e = (_d = item.Author) === null || _d === void 0 ? void 0 : _d.Id) !== null && _e !== void 0 ? _e : null; // <-- ADDED
                            return {
                                id: item.Id,
                                type: workItemType,
                                title: item.Title || '',
                                status: item.Status || (workItemType === 'incident' ? 'New' : 'Unassigned'),
                                priority: item.Priority || 'Medium',
                                site: item.Site || 'Albertsdal',
                                assignedTo: assignee === null || assignee === void 0 ? void 0 : assignee.Title,
                                assignedToId: (_g = (_f = assignee === null || assignee === void 0 ? void 0 : assignee.Id) !== null && _f !== void 0 ? _f : fallbackAssigneeId) !== null && _g !== void 0 ? _g : null,
                                assignedToEmail: (_h = assignee === null || assignee === void 0 ? void 0 : assignee.Email) !== null && _h !== void 0 ? _h : assignee === null || assignee === void 0 ? void 0 : assignee.EMail,
                                assignedToLoginName: assignee === null || assignee === void 0 ? void 0 : assignee.LoginName,
                                startDate: item.StartDate,
                                dueDate: item.DueDate,
                                createdAt: item.Created,
                                description: item.Description,
                                requestType: requestType,
                                department: item.Department || 'IT',
                                severity: item.Severity,
                                impact: item.Impact,
                                affectedService: item.AffectedService,
                                incidentTypeId: (_j = incidentType === null || incidentType === void 0 ? void 0 : incidentType.id) !== null && _j !== void 0 ? _j : _this.getPrimaryLookupId(item[incidentTypeFieldName ? "".concat(incidentTypeFieldName, "Id") : '']),
                                incidentType: incidentType,
                                slaResponseMinutes: item.SLAResponseMinutes,
                                slaResolutionMinutes: item.SLAResolutionMinutes,
                                slaDeadline: item.SLADeadline,
                                slaStatus: item.SLAStatus,
                                authorId: authorId,
                            };
                        };
                        buildSelectAndExpand = function () {
                            var selectFields = [
                                'Id', 'Title', 'Status', 'Priority', 'Site', 'StartDate', 'DueDate',
                                'Created', 'Description', 'RequestType', 'Department', 'Severity',
                                'Impact', 'AffectedService', 'SLAResponseMinutes', 'SLAResolutionMinutes',
                                'SLADeadline', 'SLAStatus',
                                "".concat(assigneeField.internalName, "/Title"),
                                "".concat(assigneeField.internalName, "/Id"),
                                "".concat(assigneeField.internalName, "/EMail"),
                                assigneeLookupField,
                                'Author/Id', // <-- ADDED
                            ];
                            var expandFields = [assigneeField.internalName, 'Author']; // <-- ADDED 'Author'
                            if (incidentTypeFieldName) {
                                selectFields.push("".concat(incidentTypeFieldName, "/Id"), "".concat(incidentTypeFieldName, "/Title"), "".concat(incidentTypeFieldName, "/Department"), "".concat(incidentTypeFieldName, "Id"));
                                expandFields.push(incidentTypeFieldName);
                            }
                            return { selectFields: selectFields, expandFields: expandFields };
                        };
                        _g.label = 4;
                    case 4:
                        _g.trys.push([4, 6, , 7]);
                        _a = buildSelectAndExpand(), selectFields = _a.selectFields, expandFields = _a.expandFields;
                        return [4 /*yield*/, (_c = (_d = sp.web.lists
                                .getByTitle(listTitle)
                                .items).select.apply(_d, selectFields))
                                .expand.apply(_c, expandFields).top(500)()];
                    case 5:
                        items = _g.sent();
                        mappedItems_1 = items.map(mapItem);
                        return [2 /*return*/, type ? mappedItems_1.filter(function (item) { return item.type === type; }) : mappedItems_1];
                    case 6:
                        primaryError_1 = _g.sent();
                        console.warn('TaskService.getTasks: full typed query failed, trying minimal expanded query.', primaryError_1);
                        return [3 /*break*/, 7];
                    case 7:
                        _g.trys.push([7, 9, , 10]);
                        _b = buildSelectAndExpand(), selectFields = _b.selectFields, expandFields = _b.expandFields;
                        minimalSelect = selectFields.filter(function (f) { return f !== "".concat(assigneeField.internalName, "/EMail"); });
                        return [4 /*yield*/, (_e = (_f = sp.web.lists
                                .getByTitle(listTitle)
                                .items).select.apply(_f, minimalSelect))
                                .expand.apply(_e, expandFields).top(500)()];
                    case 8:
                        minimalItems = _g.sent();
                        mappedItems_2 = minimalItems.map(mapItem);
                        return [2 /*return*/, type ? mappedItems_2.filter(function (item) { return item.type === type; }) : mappedItems_2];
                    case 9:
                        minimalError_1 = _g.sent();
                        console.warn('TaskService.getTasks: minimal expanded query failed, falling back to broad item fetch.', minimalError_1);
                        return [3 /*break*/, 10];
                    case 10: return [4 /*yield*/, sp.web.lists
                            .getByTitle(listTitle)
                            .items
                            .top(500)()];
                    case 11:
                        fallbackItems = _g.sent();
                        mappedItems = fallbackItems.map(mapItem);
                        return [2 /*return*/, type ? mappedItems.filter(function (item) { return item.type === type; }) : mappedItems];
                }
            });
        });
    };
    TaskService.prototype.createTask = function (task) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, listTitle, availableFields, incidentTypeFieldName, payload, assigneeField, result, raw, createdId, logError_1;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
            return tslib_1.__generator(this, function (_x) {
                switch (_x.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, this.getTaskListTitle()];
                    case 1:
                        listTitle = _x.sent();
                        return [4 /*yield*/, this.getListFieldNames()];
                    case 2:
                        availableFields = _x.sent();
                        return [4 /*yield*/, this.getIncidentTypeFieldName()];
                    case 3:
                        incidentTypeFieldName = _x.sent();
                        payload = {
                            Title: task.title,
                            Status: task.status,
                            Priority: task.priority,
                            Site: task.site,
                            StartDate: this.validateDate(task.startDate),
                            DueDate: this.validateDate(task.dueDate),
                            Description: task.description,
                            RequestType: task.requestType,
                            Department: task.department,
                        };
                        this.applyFieldIfAvailable(payload, availableFields, 'Type', task.requestType);
                        this.applyFieldIfAvailable(payload, availableFields, 'Severity', (_a = task.severity) !== null && _a !== void 0 ? _a : null);
                        this.applyFieldIfAvailable(payload, availableFields, 'Impact', (_b = task.impact) !== null && _b !== void 0 ? _b : null);
                        this.applyFieldIfAvailable(payload, availableFields, 'AffectedService', (_c = task.affectedService) !== null && _c !== void 0 ? _c : null);
                        this.applyLookupFieldIfAvailable(payload, incidentTypeFieldName, (_d = task.incidentTypeId) !== null && _d !== void 0 ? _d : null);
                        this.applyFieldIfAvailable(payload, availableFields, 'SLAResponseMinutes', (_e = task.slaResponseMinutes) !== null && _e !== void 0 ? _e : null);
                        this.applyFieldIfAvailable(payload, availableFields, 'SLAResolutionMinutes', (_f = task.slaResolutionMinutes) !== null && _f !== void 0 ? _f : null);
                        this.applyFieldIfAvailable(payload, availableFields, 'SLADeadline', this.validateDateTime(task.slaDeadline));
                        this.applyFieldIfAvailable(payload, availableFields, 'SLAStatus', (_g = task.slaStatus) !== null && _g !== void 0 ? _g : null);
                        return [4 /*yield*/, this.getAssigneeFieldConfig()];
                    case 4:
                        assigneeField = _x.sent();
                        this.applyAssigneeToPayload(payload, task.assignedToId, assigneeField);
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(listTitle)
                                .items.add(payload)];
                    case 5:
                        result = _x.sent();
                        raw = result;
                        createdId = (_v = (_t = (_r = (_q = (_p = (_o = (_l = (_j = (_h = raw === null || raw === void 0 ? void 0 : raw.data) === null || _h === void 0 ? void 0 : _h.Id) !== null && _j !== void 0 ? _j : (_k = raw === null || raw === void 0 ? void 0 : raw.data) === null || _k === void 0 ? void 0 : _k.ID) !== null && _l !== void 0 ? _l : (_m = raw === null || raw === void 0 ? void 0 : raw.data) === null || _m === void 0 ? void 0 : _m.id) !== null && _o !== void 0 ? _o : raw === null || raw === void 0 ? void 0 : raw.Id) !== null && _p !== void 0 ? _p : raw === null || raw === void 0 ? void 0 : raw.ID) !== null && _q !== void 0 ? _q : raw === null || raw === void 0 ? void 0 : raw.id) !== null && _r !== void 0 ? _r : (_s = raw === null || raw === void 0 ? void 0 : raw.item) === null || _s === void 0 ? void 0 : _s.Id) !== null && _t !== void 0 ? _t : (_u = raw === null || raw === void 0 ? void 0 : raw.item) === null || _u === void 0 ? void 0 : _u.ID) !== null && _v !== void 0 ? _v : undefined;
                        if (!(createdId && task.requestType === 'Incident')) return [3 /*break*/, 9];
                        _x.label = 6;
                    case 6:
                        _x.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, this.logIncidentCreation(createdId, task)];
                    case 7:
                        _x.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        logError_1 = _x.sent();
                        console.warn('TaskService.createTask: incident audit log failed.', logError_1);
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/, tslib_1.__assign(tslib_1.__assign({}, ((_w = raw === null || raw === void 0 ? void 0 : raw.data) !== null && _w !== void 0 ? _w : raw)), { id: createdId })];
                }
            });
        });
    };
    TaskService.prototype.updateTask = function (id, updates) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, listTitle, availableFields, incidentTypeFieldName, payload, assigneeField;
            var _a, _b, _c, _d, _e, _f, _g;
            return tslib_1.__generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, this.getTaskListTitle()];
                    case 1:
                        listTitle = _h.sent();
                        return [4 /*yield*/, this.getListFieldNames()];
                    case 2:
                        availableFields = _h.sent();
                        return [4 /*yield*/, this.getIncidentTypeFieldName()];
                    case 3:
                        incidentTypeFieldName = _h.sent();
                        payload = {
                            Title: updates.title,
                            Status: updates.status,
                            Priority: updates.priority,
                            Site: updates.site,
                            StartDate: this.validateDate(updates.startDate),
                            DueDate: this.validateDate(updates.dueDate),
                            Description: updates.description,
                            RequestType: updates.requestType,
                            Department: updates.department,
                        };
                        if (updates.requestType !== undefined) {
                            this.applyFieldIfAvailable(payload, availableFields, 'Type', updates.requestType);
                        }
                        this.applyFieldIfAvailable(payload, availableFields, 'Severity', (_a = updates.severity) !== null && _a !== void 0 ? _a : null);
                        this.applyFieldIfAvailable(payload, availableFields, 'Impact', (_b = updates.impact) !== null && _b !== void 0 ? _b : null);
                        this.applyFieldIfAvailable(payload, availableFields, 'AffectedService', (_c = updates.affectedService) !== null && _c !== void 0 ? _c : null);
                        if (updates.incidentTypeId !== undefined || updates.requestType === 'Task') {
                            this.applyLookupFieldIfAvailable(payload, incidentTypeFieldName, updates.requestType === 'Task' ? null : (_d = updates.incidentTypeId) !== null && _d !== void 0 ? _d : null);
                        }
                        if (updates.slaResponseMinutes !== undefined || updates.requestType === 'Task') {
                            this.applyFieldIfAvailable(payload, availableFields, 'SLAResponseMinutes', (_e = updates.slaResponseMinutes) !== null && _e !== void 0 ? _e : null);
                        }
                        if (updates.slaResolutionMinutes !== undefined || updates.requestType === 'Task') {
                            this.applyFieldIfAvailable(payload, availableFields, 'SLAResolutionMinutes', (_f = updates.slaResolutionMinutes) !== null && _f !== void 0 ? _f : null);
                        }
                        if (updates.slaDeadline !== undefined || updates.requestType === 'Task') {
                            this.applyFieldIfAvailable(payload, availableFields, 'SLADeadline', this.validateDateTime(updates.slaDeadline));
                        }
                        if (updates.slaStatus !== undefined || updates.requestType === 'Task') {
                            this.applyFieldIfAvailable(payload, availableFields, 'SLAStatus', (_g = updates.slaStatus) !== null && _g !== void 0 ? _g : null);
                        }
                        return [4 /*yield*/, this.getAssigneeFieldConfig()];
                    case 4:
                        assigneeField = _h.sent();
                        if (updates.assignedToId !== undefined) {
                            this.applyAssigneeToPayload(payload, updates.assignedToId, assigneeField);
                        }
                        return [4 /*yield*/, sp.web.lists.getByTitle(listTitle).items.getById(id).update(payload)];
                    case 5:
                        _h.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TaskService.prototype.deleteTask = function (id) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, listTitle;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, this.getTaskListTitle()];
                    case 1:
                        listTitle = _a.sent();
                        return [4 /*yield*/, sp.web.lists.getByTitle(listTitle).items.getById(id).delete()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // -----------------------------------------------------------------------
    // SLA Escalation & Notification
    // -----------------------------------------------------------------------
    TaskService.prototype.checkAndEscalateSLAs = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, listTitle, assigneeField, items, _i, items_1, item, requestType, newStatus, oldStatus, department, teamLead, manager, newAssignee, escalateToRole, assigneeObj, currentAssigneeId, previousName, updatePayload, collaboratorSvc, collabErr_1, currentUserId, logErr_1, notifyErr_1, error_2;
            var _a, _b, _c, _d;
            return tslib_1.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, this.getTaskListTitle()];
                    case 1:
                        listTitle = _e.sent();
                        return [4 /*yield*/, this.getAssigneeFieldConfig()];
                    case 2:
                        assigneeField = _e.sent();
                        console.log('SLA CHECK START');
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(listTitle)
                                .items
                                .select('Id', 'Title', 'Department', "".concat(assigneeField.internalName, "/Id"), "".concat(assigneeField.internalName, "/Title"), "".concat(assigneeField.internalName, "/EMail"), 'SLADeadline', 'SLAStatus', 'RequestType', 'Type', 'ResponseDueDate', 'ResolutionDueDate')
                                .expand(assigneeField.internalName)
                                .filter("ResolutionDueDate ne null and (Status ne 'Resolved' and Status ne 'Escalated')")
                                .top(500)()];
                    case 3:
                        items = _e.sent();
                        _i = 0, items_1 = items;
                        _e.label = 4;
                    case 4:
                        if (!(_i < items_1.length)) return [3 /*break*/, 27];
                        item = items_1[_i];
                        _e.label = 5;
                    case 5:
                        _e.trys.push([5, 25, , 26]);
                        requestType = this.normalizeRequestType((_a = item.RequestType) !== null && _a !== void 0 ? _a : item.Type);
                        if (requestType !== 'Incident')
                            return [3 /*break*/, 26];
                        newStatus = this.computeSlaStatus(item.ResponseDueDate, item.ResolutionDueDate);
                        oldStatus = item.SLAStatus;
                        if (!(newStatus && newStatus !== oldStatus)) return [3 /*break*/, 7];
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(listTitle)
                                .items.getById(item.Id)
                                .update({ SLAStatus: newStatus })];
                    case 6:
                        _e.sent();
                        console.log("SLA status updated for item ".concat(item.Id, ": ").concat(oldStatus, " \u2192 ").concat(newStatus));
                        _e.label = 7;
                    case 7:
                        if (newStatus !== 'Breached')
                            return [3 /*break*/, 26];
                        department = (_b = item.Department) !== null && _b !== void 0 ? _b : '';
                        if (!department) {
                            console.warn("No department for item ".concat(item.Id));
                            return [3 /*break*/, 26];
                        }
                        return [4 /*yield*/, this.getDepartmentRole(department, 'TeamLead')];
                    case 8:
                        teamLead = _e.sent();
                        return [4 /*yield*/, this.getDepartmentRole(department, 'Manager')];
                    case 9:
                        manager = _e.sent();
                        newAssignee = teamLead;
                        escalateToRole = 'TeamLead';
                        if (!newAssignee) {
                            newAssignee = manager;
                            escalateToRole = 'Manager';
                        }
                        if (!newAssignee) {
                            console.warn("Neither team lead nor manager found for department: ".concat(department));
                            return [3 /*break*/, 26];
                        }
                        assigneeObj = item[assigneeField.internalName];
                        currentAssigneeId = this.getPrimaryAssigneeId(assigneeObj === null || assigneeObj === void 0 ? void 0 : assigneeObj.Id);
                        if (currentAssigneeId === newAssignee.id)
                            return [3 /*break*/, 26];
                        previousName = (_c = assigneeObj === null || assigneeObj === void 0 ? void 0 : assigneeObj.Title) !== null && _c !== void 0 ? _c : '';
                        updatePayload = {
                            SLAStatus: 'Breached',
                            Status: 'Escalated'
                        };
                        this.applyAssigneeToPayload(updatePayload, newAssignee.id, assigneeField);
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(listTitle)
                                .items.getById(item.Id)
                                .update(updatePayload)];
                    case 10:
                        _e.sent();
                        console.log("ESCALATED to ".concat(escalateToRole, ": ").concat(newAssignee.name));
                        if (!(escalateToRole === 'TeamLead' && manager && manager.id !== newAssignee.id)) return [3 /*break*/, 14];
                        _e.label = 11;
                    case 11:
                        _e.trys.push([11, 13, , 14]);
                        collaboratorSvc = new CollaboratorService_1.CollaboratorService();
                        return [4 /*yield*/, collaboratorSvc.addCollaboratorToTask(listTitle, item.Id, manager.id)];
                    case 12:
                        _e.sent();
                        console.log("Manager added as collaborator: ".concat(manager.name));
                        return [3 /*break*/, 14];
                    case 13:
                        collabErr_1 = _e.sent();
                        console.warn('Could not add manager as collaborator', collabErr_1);
                        return [3 /*break*/, 14];
                    case 14: return [4 /*yield*/, this.logSlaEscalation(item.Id, previousName, newAssignee.name)];
                    case 15:
                        _e.sent();
                        if (!(escalateToRole === 'TeamLead' && manager && manager.id !== newAssignee.id)) return [3 /*break*/, 20];
                        _e.label = 16;
                    case 16:
                        _e.trys.push([16, 19, , 20]);
                        return [4 /*yield*/, this.getCurrentUserId()];
                    case 17:
                        currentUserId = _e.sent();
                        return [4 /*yield*/, this.addIncidentLog(item.Id, 'Escalation', 'CollaboratorAdded', null, "".concat(manager.name, " (Manager)"), currentUserId)];
                    case 18:
                        _e.sent();
                        return [3 /*break*/, 20];
                    case 19:
                        logErr_1 = _e.sent();
                        console.warn('Could not log manager addition', logErr_1);
                        return [3 /*break*/, 20];
                    case 20:
                        if (!this.notificationService) return [3 /*break*/, 24];
                        _e.label = 21;
                    case 21:
                        _e.trys.push([21, 23, , 24]);
                        return [4 /*yield*/, this.notificationService.sendEscalationNotification({
                                escalatedToEmail: newAssignee.email,
                                escalatedToName: newAssignee.name,
                                managerEmail: manager === null || manager === void 0 ? void 0 : manager.email,
                                incidentTitle: (_d = item.Title) !== null && _d !== void 0 ? _d : '',
                                incidentId: String(item.Id),
                                department: department,
                                oldAssignee: previousName,
                            })];
                    case 22:
                        _e.sent();
                        console.log('Notification sent for item', item.Id);
                        return [3 /*break*/, 24];
                    case 23:
                        notifyErr_1 = _e.sent();
                        console.warn('Failed to send escalation notification', notifyErr_1);
                        return [3 /*break*/, 24];
                    case 24: return [3 /*break*/, 26];
                    case 25:
                        error_2 = _e.sent();
                        console.error('TaskService.checkAndEscalateSLAs: escalation failed for item', item.Id, error_2);
                        return [3 /*break*/, 26];
                    case 26:
                        _i++;
                        return [3 /*break*/, 4];
                    case 27: return [2 /*return*/];
                }
            });
        });
    };
    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------
    TaskService.prototype.validateDate = function (date) {
        if (!date)
            return null;
        var dateOnlyMatch = date.match(/^\d{4}-\d{2}-\d{2}/);
        if (dateOnlyMatch)
            return dateOnlyMatch[0];
        var parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }
        return null;
    };
    TaskService.prototype.validateDateTime = function (value) {
        if (!value)
            return null;
        var parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed.toISOString();
    };
    TaskService.prototype.getTaskListTitle = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                if (!this.listTitlePromise) {
                    this.listTitlePromise = this.resolveTaskListTitle();
                }
                return [2 /*return*/, this.listTitlePromise];
            });
        });
    };
    TaskService.prototype.resolveTaskListTitle = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, _i, TASK_LIST_TITLE_CANDIDATES_1, listTitle, _a;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        _i = 0, TASK_LIST_TITLE_CANDIDATES_1 = TASK_LIST_TITLE_CANDIDATES;
                        _b.label = 1;
                    case 1:
                        if (!(_i < TASK_LIST_TITLE_CANDIDATES_1.length)) return [3 /*break*/, 6];
                        listTitle = TASK_LIST_TITLE_CANDIDATES_1[_i];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, sp.web.lists.getByTitle(listTitle).select('Id')()];
                    case 3:
                        _b.sent();
                        return [2 /*return*/, listTitle];
                    case 4:
                        _a = _b.sent();
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/, TASK_LIST_TITLE_CANDIDATES[0]];
                }
            });
        });
    };
    TaskService.prototype.getListFieldNames = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                if (!this.listFieldNamesPromise) {
                    this.listFieldNamesPromise = this.loadListFieldNames();
                }
                return [2 /*return*/, this.listFieldNamesPromise];
            });
        });
    };
    TaskService.prototype.getIncidentTypeFieldName = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                if (!this.incidentTypeFieldNamePromise) {
                    this.incidentTypeFieldNamePromise = this.loadIncidentTypeFieldName();
                }
                return [2 /*return*/, this.incidentTypeFieldNamePromise];
            });
        });
    };
    TaskService.prototype.loadListFieldNames = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, listTitle, fields;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, this.getTaskListTitle()];
                    case 1:
                        listTitle = _a.sent();
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(listTitle)
                                .fields.select('InternalName')()];
                    case 2:
                        fields = _a.sent();
                        return [2 /*return*/, new Set(fields.map(function (field) { return field.InternalName; }))];
                }
            });
        });
    };
    TaskService.prototype.loadIncidentTypeFieldName = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, listTitle, fields, field;
            var _this = this;
            var _a;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, this.getTaskListTitle()];
                    case 1:
                        listTitle = _b.sent();
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(listTitle)
                                .fields.select('InternalName', 'Title', 'TypeAsString')()];
                    case 2:
                        fields = _b.sent();
                        field = fields.find(function (candidate) {
                            if (!(candidate === null || candidate === void 0 ? void 0 : candidate.InternalName))
                                return false;
                            if (candidate.TypeAsString !== 'Lookup' && candidate.TypeAsString !== 'LookupMulti')
                                return false;
                            var normalizedInternalName = _this.normalizeFieldName(candidate.InternalName);
                            var normalizedTitle = _this.normalizeFieldName(candidate.Title);
                            return INCIDENT_TYPE_FIELD_CANDIDATES.some(function (name) {
                                var normalizedCandidate = _this.normalizeFieldName(name);
                                return normalizedInternalName === normalizedCandidate || normalizedTitle === normalizedCandidate;
                            });
                        });
                        return [2 /*return*/, (_a = field === null || field === void 0 ? void 0 : field.InternalName) !== null && _a !== void 0 ? _a : null];
                }
            });
        });
    };
    TaskService.prototype.getAssigneeFieldConfig = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                if (!this.assigneeFieldConfigPromise) {
                    this.assigneeFieldConfigPromise = this.loadAssigneeFieldConfig();
                }
                return [2 /*return*/, this.assigneeFieldConfigPromise];
            });
        });
    };
    TaskService.prototype.loadAssigneeFieldConfig = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, listTitle, fields, field;
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, this.getTaskListTitle()];
                    case 1:
                        listTitle = _a.sent();
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(listTitle)
                                .fields.select('InternalName', 'Title', 'TypeAsString', 'AllowMultipleValues')()];
                    case 2:
                        fields = _a.sent();
                        field = fields.find(function (candidate) {
                            if (!(candidate === null || candidate === void 0 ? void 0 : candidate.InternalName))
                                return false;
                            if (candidate.TypeAsString !== 'User' && candidate.TypeAsString !== 'UserMulti')
                                return false;
                            var normalizedInternalName = _this.normalizeFieldName(candidate.InternalName);
                            var normalizedTitle = _this.normalizeFieldName(candidate.Title);
                            return ASSIGNEE_FIELD_CANDIDATES.some(function (name) {
                                var normalizedCandidate = _this.normalizeFieldName(name);
                                return normalizedInternalName === normalizedCandidate || normalizedTitle === normalizedCandidate;
                            });
                        });
                        if (!field) {
                            return [2 /*return*/, { internalName: 'AssignedTo', isMulti: false }];
                        }
                        return [2 /*return*/, {
                                internalName: field.InternalName,
                                isMulti: field.AllowMultipleValues === true || field.TypeAsString === 'UserMulti',
                            }];
                }
            });
        });
    };
    TaskService.prototype.applyAssigneeToPayload = function (payload, assignedToId, fieldConfig) {
        var fieldName = fieldConfig.internalName;
        if (assignedToId === null || assignedToId === undefined) {
            payload["".concat(fieldName, "Id")] = null;
            return;
        }
        if (!fieldConfig.isMulti) {
            payload["".concat(fieldName, "Id")] = assignedToId;
            return;
        }
        payload["".concat(fieldName, "Id")] = { results: [assignedToId] };
    };
    TaskService.prototype.applyFieldIfAvailable = function (payload, availableFields, fieldName, value) {
        if (!availableFields.has(fieldName))
            return;
        payload[fieldName] = value !== null && value !== void 0 ? value : null;
    };
    TaskService.prototype.applyLookupFieldIfAvailable = function (payload, fieldName, lookupId) {
        if (!fieldName)
            return;
        payload["".concat(fieldName, "Id")] = lookupId;
    };
    TaskService.prototype.logIncidentCreation = function (workItemId, task) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, fields, workItemField, actionField, timestampField, newValueField, payload;
            var _a, _b, _c, _d;
            return tslib_1.__generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(INCIDENT_LOG_LIST_TITLE)
                                .fields.select('InternalName', 'Title', 'TypeAsString')()];
                    case 1:
                        fields = _e.sent();
                        workItemField = this.findFieldByCandidates(fields, INCIDENT_LOG_WORKITEM_FIELD_CANDIDATES);
                        actionField = this.findFieldByCandidates(fields, INCIDENT_LOG_ACTION_FIELD_CANDIDATES);
                        timestampField = this.findFieldByCandidates(fields, INCIDENT_LOG_TIMESTAMP_FIELD_CANDIDATES);
                        newValueField = this.findFieldByCandidates(fields, INCIDENT_LOG_NEWVALUE_FIELD_CANDIDATES);
                        payload = {
                            Title: 'Incident Created',
                        };
                        if (workItemField) {
                            if (workItemField.TypeAsString === 'Lookup' || workItemField.TypeAsString === 'LookupMulti') {
                                payload["".concat(workItemField.InternalName, "Id")] = workItemId;
                            }
                            else {
                                payload[workItemField.InternalName] = workItemId;
                            }
                        }
                        if (actionField) {
                            payload[actionField.InternalName] = 'Created';
                        }
                        if (timestampField) {
                            payload[timestampField.InternalName] = new Date().toISOString();
                        }
                        if (newValueField) {
                            payload[newValueField.InternalName] = JSON.stringify({
                                severity: (_a = task.severity) !== null && _a !== void 0 ? _a : null,
                                incidentTypeId: (_b = task.incidentTypeId) !== null && _b !== void 0 ? _b : null,
                                incidentType: (_d = (_c = task.incidentType) === null || _c === void 0 ? void 0 : _c.title) !== null && _d !== void 0 ? _d : null,
                            });
                        }
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(INCIDENT_LOG_LIST_TITLE)
                                .items.add(payload)];
                    case 2:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TaskService.prototype.getPrimaryAssignee = function (value) {
        if (!value)
            return undefined;
        return Array.isArray(value) ? value[0] : value;
    };
    TaskService.prototype.getPrimaryAssigneeId = function (value) {
        var _a;
        if (typeof value === 'number')
            return value;
        if (Array.isArray(value))
            return value[0];
        return (_a = value === null || value === void 0 ? void 0 : value.results) === null || _a === void 0 ? void 0 : _a[0];
    };
    TaskService.prototype.getPrimaryLookupId = function (value) {
        var _a;
        if (typeof value === 'number')
            return value;
        if (Array.isArray(value))
            return value[0];
        return (_a = value === null || value === void 0 ? void 0 : value.results) === null || _a === void 0 ? void 0 : _a[0];
    };
    TaskService.prototype.findFieldByCandidates = function (fields, candidates) {
        var _this = this;
        return fields.find(function (candidate) {
            if (!(candidate === null || candidate === void 0 ? void 0 : candidate.InternalName))
                return false;
            var normalizedInternalName = _this.normalizeFieldName(candidate.InternalName);
            var normalizedTitle = _this.normalizeFieldName(candidate.Title);
            return candidates.some(function (name) {
                var normalizedCandidate = _this.normalizeFieldName(name);
                return normalizedInternalName === normalizedCandidate || normalizedTitle === normalizedCandidate;
            });
        });
    };
    TaskService.prototype.getIncidentTypeValue = function (value) {
        if (!value)
            return null;
        var item = Array.isArray(value) ? value[0] : value;
        if (!(item === null || item === void 0 ? void 0 : item.Id) || !(item === null || item === void 0 ? void 0 : item.Title))
            return null;
        return {
            id: item.Id,
            title: item.Title,
            severity: item.Severity,
            department: item.Department,
        };
    };
    TaskService.prototype.normalizeFieldName = function (value) {
        return (value !== null && value !== void 0 ? value : '')
            .replace(/_x0020_/gi, '')
            .replace(/\s+/g, '')
            .toLowerCase();
    };
    TaskService.prototype.normalizeRequestType = function (value) {
        return (value !== null && value !== void 0 ? value : '').toLowerCase() === 'incident' ? 'Incident' : 'Task';
    };
    TaskService.prototype.toWorkItemType = function (requestType) {
        return requestType === 'Incident' ? 'incident' : 'task';
    };
    // -----------------------------------------------------------------------
    // SLA helper methods
    // -----------------------------------------------------------------------
    TaskService.prototype.computeSlaStatus = function (responseDue, resolutionDue) {
        if (!resolutionDue)
            return 'OnTrack';
        var now = new Date();
        var resDate = new Date(resolutionDue);
        var responseDate = responseDue ? new Date(responseDue) : null;
        if (resDate <= now)
            return 'Breached';
        if (responseDate && responseDate <= now)
            return 'AtRisk';
        var remainingMs = resDate.getTime() - now.getTime();
        var remainingHours = remainingMs / (1000 * 60 * 60);
        if (remainingHours <= TaskService.AT_RISK_REMAINING_HOURS)
            return 'AtRisk';
        return 'OnTrack';
    };
    TaskService.prototype.getDepartmentRole = function (department, role) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, items, user, e_1;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(USER_ROLE_LIST_TITLE)
                                .items
                                .filter("Department eq '".concat(department, "' and Role eq '").concat(role, "'"))
                                .select('User/Id', 'User/Title', 'User/EMail')
                                .expand('User')()];
                    case 1:
                        items = _a.sent();
                        if (items.length === 0)
                            return [2 /*return*/, null];
                        user = items[0].User;
                        return [2 /*return*/, {
                                id: user.Id,
                                name: user.Title,
                                email: user.EMail,
                            }];
                    case 2:
                        e_1 = _a.sent();
                        console.warn("Failed to fetch ".concat(role, " for ").concat(department), e_1);
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    TaskService.prototype.logSlaEscalation = function (itemId, previousAssignee, newAssignee) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var currentUserId;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getCurrentUserId()];
                    case 1:
                        currentUserId = _a.sent();
                        return [4 /*yield*/, this.addIncidentLog(itemId, 'Escalation', 'AssignedTo', previousAssignee, newAssignee, currentUserId)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TaskService.prototype.getCurrentUserId = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, user;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, sp.web.currentUser()];
                    case 1:
                        user = _a.sent();
                        return [2 /*return*/, user.Id];
                }
            });
        });
    };
    TaskService.prototype.addIncidentLog = function (workItemId, action, fieldName, oldValue, newValue, performedById) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, fields, workItemField, actionField, timestampField, fieldNameField, oldValueField, newValueField, performedByField, payload;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(INCIDENT_LOG_LIST_TITLE)
                                .fields.select('InternalName', 'Title', 'TypeAsString')()];
                    case 1:
                        fields = _a.sent();
                        workItemField = this.findFieldByCandidates(fields, INCIDENT_LOG_WORKITEM_FIELD_CANDIDATES);
                        actionField = this.findFieldByCandidates(fields, INCIDENT_LOG_ACTION_FIELD_CANDIDATES);
                        timestampField = this.findFieldByCandidates(fields, INCIDENT_LOG_TIMESTAMP_FIELD_CANDIDATES);
                        fieldNameField = this.findFieldByCandidates(fields, INCIDENT_LOG_FIELDNAME_FIELD_CANDIDATES);
                        oldValueField = this.findFieldByCandidates(fields, INCIDENT_LOG_OLDVALUE_FIELD_CANDIDATES);
                        newValueField = this.findFieldByCandidates(fields, INCIDENT_LOG_NEWVALUE_FIELD_CANDIDATES);
                        performedByField = this.findFieldByCandidates(fields, INCIDENT_LOG_PERFORMEDBY_FIELD_CANDIDATES);
                        payload = {};
                        if (workItemField) {
                            if (workItemField.TypeAsString === 'Lookup' || workItemField.TypeAsString === 'LookupMulti') {
                                payload["".concat(workItemField.InternalName, "Id")] = workItemId;
                            }
                            else {
                                payload[workItemField.InternalName] = workItemId;
                            }
                        }
                        if (actionField)
                            payload[actionField.InternalName] = action;
                        if (timestampField)
                            payload[timestampField.InternalName] = new Date().toISOString();
                        if (fieldNameField)
                            payload[fieldNameField.InternalName] = fieldName;
                        if (oldValueField)
                            payload[oldValueField.InternalName] = oldValue;
                        if (newValueField)
                            payload[newValueField.InternalName] = newValue;
                        if (performedByField) {
                            payload["".concat(performedByField.InternalName, "Id")] = performedById;
                        }
                        return [4 /*yield*/, sp.web.lists.getByTitle(INCIDENT_LOG_LIST_TITLE).items.add(payload)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TaskService.AT_RISK_REMAINING_HOURS = 1;
    return TaskService;
}());
exports.TaskService = TaskService;
//# sourceMappingURL=TaskService.js.map