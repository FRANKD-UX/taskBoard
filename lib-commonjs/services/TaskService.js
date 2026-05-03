"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
var tslib_1 = require("tslib");
require("@pnp/sp/fields");
var pnpjsConfig_1 = require("../pnpjsConfig");
var incidentSla_1 = require("../webparts/taskBoard/components/incidentSla");
// ---------------------------------------------------------------------------
// Constants — list and field name candidates
//
// We use candidate arrays so the service can locate fields even when SP
// internal names differ slightly across environments. The first matching
// candidate wins. Order matters — put your most likely name first.
// ---------------------------------------------------------------------------
var TASK_LIST_TITLE_CANDIDATES = ['WorkItems', 'Tasks', 'Task Management System'];
var ASSIGNEE_FIELD_CANDIDATES = [
    'AssignedTo',
    'Assigned To',
    'AssignedUser',
    'Assigned User',
];
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
// Field lists for getTasks
//
// TASK_REQUIRED_SELECT_FIELDS — always requested; these are standard SP
// built-in columns or columns every environment is expected to have.
//
// TASK_OPTIONAL_SELECT_FIELDS — only added to the query when the field
// actually exists on the list. This prevents the 400 Bad Request SP returns
// when you ask for a column that hasn't been created yet.
// ---------------------------------------------------------------------------
var TASK_REQUIRED_SELECT_FIELDS = [
    'Id',
    'Title',
    'Status',
    'Priority',
    'Site',
    'StartDate',
    'DueDate',
    'Created',
    'Description',
    'RequestType',
    'Type',
    'Department',
    'AssignedTo/Id',
    'AssignedTo/Title',
    'AssignedTo/EMail',
    'AssignedToId',
];
// These are columns your list may or may not have yet. The service checks
// the list's field schema and only includes the ones that actually exist.
var TASK_OPTIONAL_SELECT_FIELDS = [
    'Severity',
    'Impact',
    'AffectedService',
    'SLAResponseMinutes',
    'SLAResolutionMinutes',
    'ResponseDueDate',
    'ResolutionDueDate',
    'SLADeadline',
    'SLAStatus',
];
var TASK_CORE_EXPAND_FIELDS = ['AssignedTo'];
// ---------------------------------------------------------------------------
// TaskService
// ---------------------------------------------------------------------------
var TaskService = /** @class */ (function () {
    function TaskService() {
    }
    // ---------------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------------
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
                                .items.select('Id', 'Title', 'Severity', 'Department', 'IsActive')
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
    TaskService.prototype.checkAndEscalateSLAs = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, listTitle, now, items, _i, items_1, item, requestType, deadline, department, lead, previousAssignedTo, previousName, error_2;
            var _a, _b, _c;
            return tslib_1.__generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, this.getTaskListTitle()];
                    case 1:
                        listTitle = _d.sent();
                        now = new Date();
                        console.log('SLA CHECK START');
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(listTitle)
                                .items
                                .select('Id', 'Title', 'Department', 'AssignedTo/Id', 'AssignedTo/Title', 'AssignedTo/EMail', 'AssignedToId', 'SLADeadline', 'SLAStatus', 'RequestType', 'Type')
                                .expand('AssignedTo')
                                .filter("SLADeadline ne null and (SLAStatus ne 'Breached' or SLAStatus eq null)")
                                .top(500)()];
                    case 2:
                        items = _d.sent();
                        _i = 0, items_1 = items;
                        _d.label = 3;
                    case 3:
                        if (!(_i < items_1.length)) return [3 /*break*/, 10];
                        item = items_1[_i];
                        _d.label = 4;
                    case 4:
                        _d.trys.push([4, 8, , 9]);
                        requestType = this.normalizeRequestType((_a = item.RequestType) !== null && _a !== void 0 ? _a : item.Type);
                        if (requestType !== 'Incident')
                            return [3 /*break*/, 9];
                        deadline = item.SLADeadline ? new Date(item.SLADeadline) : null;
                        if (!deadline || isNaN(deadline.getTime()))
                            return [3 /*break*/, 9];
                        if (now <= deadline)
                            return [3 /*break*/, 9];
                        console.log("BREACH DETECTED: ".concat(item.Id));
                        department = (_b = item.Department) !== null && _b !== void 0 ? _b : '';
                        return [4 /*yield*/, this.getDepartmentLead(department)];
                    case 5:
                        lead = _d.sent();
                        if (!lead) {
                            console.warn("NO LEAD FOUND for Department: ".concat(department));
                            return [3 /*break*/, 9];
                        }
                        previousAssignedTo = this.getPrimaryAssignee(item.AssignedTo);
                        previousName = (_c = previousAssignedTo === null || previousAssignedTo === void 0 ? void 0 : previousAssignedTo.Title) !== null && _c !== void 0 ? _c : 'Unassigned';
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(listTitle)
                                .items
                                .getById(item.Id)
                                .update({
                                AssignedToId: lead.id,
                                SLAStatus: 'Breached',
                            })];
                    case 6:
                        _d.sent();
                        console.log("ESCALATED TO: ".concat(lead.name));
                        return [4 /*yield*/, this.logSlaEscalation(item.Id, previousName, lead.name)];
                    case 7:
                        _d.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        error_2 = _d.sent();
                        console.error('TaskService.checkAndEscalateSLAs: escalation failed', error_2);
                        return [3 /*break*/, 9];
                    case 9:
                        _i++;
                        return [3 /*break*/, 3];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    TaskService.prototype.getTasks = function (type) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, listTitle, assigneeField, incidentTypeFieldName, existingFields, presentOptionalFields, missing, selectFields, mapItem, items, mappedItems_1, primaryError_1, fallbackSelectFields, items, mappedItems_2, fallbackError_1, broadItems, mappedItems;
            var _a, _b, _c;
            var _this = this;
            return tslib_1.__generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, this.getTaskListTitle()];
                    case 1:
                        listTitle = _d.sent();
                        return [4 /*yield*/, this.getAssigneeFieldConfig()];
                    case 2:
                        assigneeField = _d.sent();
                        return [4 /*yield*/, this.getIncidentTypeFieldName()];
                    case 3:
                        incidentTypeFieldName = _d.sent();
                        return [4 /*yield*/, this.getListFieldNames()];
                    case 4:
                        existingFields = _d.sent();
                        presentOptionalFields = TASK_OPTIONAL_SELECT_FIELDS.filter(function (field) { return existingFields.has(field); });
                        if (presentOptionalFields.length < TASK_OPTIONAL_SELECT_FIELDS.length) {
                            missing = TASK_OPTIONAL_SELECT_FIELDS.filter(function (f) { return !existingFields.has(f); });
                            console.info('TaskService.getTasks: the following optional columns are not on the list and will be skipped:', missing.join(', '));
                        }
                        selectFields = tslib_1.__spreadArray(tslib_1.__spreadArray(tslib_1.__spreadArray([], TASK_REQUIRED_SELECT_FIELDS, true), presentOptionalFields, true), (incidentTypeFieldName ? ["".concat(incidentTypeFieldName, "Id")] : []), true);
                        mapItem = function (item) {
                            var _a, _b, _c, _d, _e, _f, _g;
                            var assignee = _this.getPrimaryAssignee(item.AssignedTo);
                            var assignedToUser = {
                                id: (_a = assignee === null || assignee === void 0 ? void 0 : assignee.Id) !== null && _a !== void 0 ? _a : null,
                                name: (_b = assignee === null || assignee === void 0 ? void 0 : assignee.Title) !== null && _b !== void 0 ? _b : '',
                                email: (_d = (_c = assignee === null || assignee === void 0 ? void 0 : assignee.Email) !== null && _c !== void 0 ? _c : assignee === null || assignee === void 0 ? void 0 : assignee.EMail) !== null && _d !== void 0 ? _d : '',
                            };
                            // AssignedToId can come back from SP as a plain number (single User)
                            // or as { results: [id] } (UserMulti). getPrimaryAssigneeId handles both.
                            var fallbackAssigneeId = _this.getPrimaryAssigneeId(item.AssignedToId);
                            var requestType = _this.normalizeRequestType((_e = item.RequestType) !== null && _e !== void 0 ? _e : item.Type);
                            var workItemType = _this.toWorkItemType(requestType);
                            var incidentTypeLookupKey = incidentTypeFieldName
                                ? "".concat(incidentTypeFieldName, "Id")
                                : '';
                            return {
                                id: item.Id,
                                type: workItemType,
                                title: item.Title || '',
                                status: item.Status || (workItemType === 'incident' ? 'New' : 'Unassigned'),
                                priority: item.Priority || 'Medium',
                                // Default to Albertsdal (main office) when Site is blank —
                                // covers tasks created before the Site column was added.
                                site: item.Site || 'Albertsdal',
                                assignedTo: assignedToUser.name,
                                assignedToUser: assignedToUser,
                                assignedToId: (_g = (_f = assignedToUser.id) !== null && _f !== void 0 ? _f : fallbackAssigneeId) !== null && _g !== void 0 ? _g : null,
                                assignedToEmail: assignedToUser.email,
                                assignedToLoginName: undefined,
                                startDate: item.StartDate,
                                dueDate: item.DueDate,
                                createdAt: item.Created,
                                description: item.Description,
                                requestType: requestType,
                                department: item.Department || 'IT',
                                severity: item.Severity,
                                impact: item.Impact,
                                affectedService: item.AffectedService,
                                incidentTypeId: incidentTypeLookupKey
                                    ? _this.getPrimaryLookupId(item[incidentTypeLookupKey])
                                    : undefined,
                                incidentType: null,
                                slaResponseMinutes: item.SLAResponseMinutes,
                                slaResolutionMinutes: item.SLAResolutionMinutes,
                                responseDueDate: item.ResponseDueDate,
                                resolutionDueDate: item.ResolutionDueDate,
                                slaDeadline: item.SLADeadline,
                                slaStatus: item.SLAStatus,
                            };
                        };
                        _d.label = 5;
                    case 5:
                        _d.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, (_a = (_b = sp.web.lists
                                .getByTitle(listTitle)
                                .items).select.apply(_b, selectFields))
                                .expand.apply(_a, TASK_CORE_EXPAND_FIELDS).top(500)()];
                    case 6:
                        items = _d.sent();
                        mappedItems_1 = items.map(mapItem);
                        return [2 /*return*/, type ? mappedItems_1.filter(function (item) { return item.type === type; }) : mappedItems_1];
                    case 7:
                        primaryError_1 = _d.sent();
                        console.warn('TaskService.getTasks: full select query failed, trying without User expansion.', primaryError_1);
                        return [3 /*break*/, 8];
                    case 8:
                        _d.trys.push([8, 10, , 11]);
                        fallbackSelectFields = [
                            'Id', 'Title', 'Status', 'Priority', 'Site',
                            'StartDate', 'DueDate', 'Created', 'Description',
                            'RequestType', 'Type', 'Department', 'Severity',
                            'AssignedToId',
                        ];
                        return [4 /*yield*/, (_c = sp.web.lists
                                .getByTitle(listTitle)
                                .items).select.apply(_c, fallbackSelectFields).top(500)()];
                    case 9:
                        items = _d.sent();
                        console.warn('TaskService.getTasks: operating in fallback mode — AssignedTo display names unavailable.');
                        mappedItems_2 = items.map(mapItem);
                        return [2 /*return*/, type ? mappedItems_2.filter(function (item) { return item.type === type; }) : mappedItems_2];
                    case 10:
                        fallbackError_1 = _d.sent();
                        console.warn('TaskService.getTasks: fallback query also failed, fetching all fields.', fallbackError_1);
                        return [3 /*break*/, 11];
                    case 11: return [4 /*yield*/, sp.web.lists
                            .getByTitle(listTitle)
                            .items.top(500)()];
                    case 12:
                        broadItems = _d.sent();
                        mappedItems = broadItems.map(mapItem);
                        return [2 /*return*/, type ? mappedItems.filter(function (item) { return item.type === type; }) : mappedItems];
                }
            });
        });
    };
    TaskService.prototype.createTask = function (task) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, listTitle, availableFields, incidentTypeFieldName, incidentContext, _a, payload, assigneeField, result, raw, createdId, currentUserId, logError_1;
            var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6;
            return tslib_1.__generator(this, function (_7) {
                switch (_7.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, this.getTaskListTitle()];
                    case 1:
                        listTitle = _7.sent();
                        return [4 /*yield*/, this.getListFieldNames()];
                    case 2:
                        availableFields = _7.sent();
                        return [4 /*yield*/, this.getIncidentTypeFieldName()];
                    case 3:
                        incidentTypeFieldName = _7.sent();
                        if (!(task.requestType === 'Incident')) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.resolveIncidentContext(task.incidentTypeId)];
                    case 4:
                        _a = _7.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        _a = null;
                        _7.label = 6;
                    case 6:
                        incidentContext = _a;
                        payload = {
                            Title: task.title,
                            Status: task.status,
                            Priority: (_b = incidentContext === null || incidentContext === void 0 ? void 0 : incidentContext.priority) !== null && _b !== void 0 ? _b : task.priority,
                            Site: task.site,
                            StartDate: this.validateDate(task.startDate),
                            DueDate: this.validateDate(task.dueDate),
                            Description: task.description,
                            RequestType: task.requestType,
                            Department: (incidentContext === null || incidentContext === void 0 ? void 0 : incidentContext.incidentType.department) || task.department,
                        };
                        this.applyFieldIfAvailable(payload, availableFields, 'Type', task.requestType);
                        this.applyFieldIfAvailable(payload, availableFields, 'Severity', (_d = (_c = incidentContext === null || incidentContext === void 0 ? void 0 : incidentContext.incidentType.severity) !== null && _c !== void 0 ? _c : task.severity) !== null && _d !== void 0 ? _d : null);
                        this.applyFieldIfAvailable(payload, availableFields, 'Impact', (_e = task.impact) !== null && _e !== void 0 ? _e : null);
                        this.applyFieldIfAvailable(payload, availableFields, 'AffectedService', (_f = task.affectedService) !== null && _f !== void 0 ? _f : null);
                        this.applyLookupFieldIfAvailable(payload, incidentTypeFieldName, (_h = (_g = incidentContext === null || incidentContext === void 0 ? void 0 : incidentContext.incidentType.id) !== null && _g !== void 0 ? _g : task.incidentTypeId) !== null && _h !== void 0 ? _h : null);
                        this.applyFieldIfAvailable(payload, availableFields, 'SLAResponseMinutes', (_k = (_j = incidentContext === null || incidentContext === void 0 ? void 0 : incidentContext.sla.responseMinutes) !== null && _j !== void 0 ? _j : task.slaResponseMinutes) !== null && _k !== void 0 ? _k : null);
                        this.applyFieldIfAvailable(payload, availableFields, 'SLAResolutionMinutes', (_m = (_l = incidentContext === null || incidentContext === void 0 ? void 0 : incidentContext.sla.resolutionMinutes) !== null && _l !== void 0 ? _l : task.slaResolutionMinutes) !== null && _m !== void 0 ? _m : null);
                        this.applyFieldIfAvailable(payload, availableFields, 'ResponseDueDate', this.validateDateTime((_o = incidentContext === null || incidentContext === void 0 ? void 0 : incidentContext.sla.responseDueDate) !== null && _o !== void 0 ? _o : task.responseDueDate));
                        this.applyFieldIfAvailable(payload, availableFields, 'ResolutionDueDate', this.validateDateTime((_p = incidentContext === null || incidentContext === void 0 ? void 0 : incidentContext.sla.resolutionDueDate) !== null && _p !== void 0 ? _p : task.resolutionDueDate));
                        this.applyFieldIfAvailable(payload, availableFields, 'SLADeadline', this.validateDateTime((_q = incidentContext === null || incidentContext === void 0 ? void 0 : incidentContext.sla.deadline) !== null && _q !== void 0 ? _q : task.slaDeadline));
                        this.applyFieldIfAvailable(payload, availableFields, 'SLAStatus', (_s = (_r = incidentContext === null || incidentContext === void 0 ? void 0 : incidentContext.sla.status) !== null && _r !== void 0 ? _r : task.slaStatus) !== null && _s !== void 0 ? _s : null);
                        return [4 /*yield*/, this.getAssigneeFieldConfig()];
                    case 7:
                        assigneeField = _7.sent();
                        this.applyAssigneeToPayload(payload, task.assignedToId, assigneeField);
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(listTitle)
                                .items.add(payload)];
                    case 8:
                        result = _7.sent();
                        raw = result;
                        createdId = (_5 = (_3 = (_1 = (_0 = (_z = (_y = (_w = (_u = (_t = raw === null || raw === void 0 ? void 0 : raw.data) === null || _t === void 0 ? void 0 : _t.Id) !== null && _u !== void 0 ? _u : (_v = raw === null || raw === void 0 ? void 0 : raw.data) === null || _v === void 0 ? void 0 : _v.ID) !== null && _w !== void 0 ? _w : (_x = raw === null || raw === void 0 ? void 0 : raw.data) === null || _x === void 0 ? void 0 : _x.id) !== null && _y !== void 0 ? _y : raw === null || raw === void 0 ? void 0 : raw.Id) !== null && _z !== void 0 ? _z : raw === null || raw === void 0 ? void 0 : raw.ID) !== null && _0 !== void 0 ? _0 : raw === null || raw === void 0 ? void 0 : raw.id) !== null && _1 !== void 0 ? _1 : (_2 = raw === null || raw === void 0 ? void 0 : raw.item) === null || _2 === void 0 ? void 0 : _2.Id) !== null && _3 !== void 0 ? _3 : (_4 = raw === null || raw === void 0 ? void 0 : raw.item) === null || _4 === void 0 ? void 0 : _4.ID) !== null && _5 !== void 0 ? _5 : undefined;
                        if (!(createdId && task.requestType === 'Incident' && incidentContext)) return [3 /*break*/, 13];
                        _7.label = 9;
                    case 9:
                        _7.trys.push([9, 12, , 13]);
                        return [4 /*yield*/, this.getCurrentUserId()];
                    case 10:
                        currentUserId = _7.sent();
                        return [4 /*yield*/, this.logIncidentCreation(createdId, task, incidentContext, currentUserId)];
                    case 11:
                        _7.sent();
                        return [3 /*break*/, 13];
                    case 12:
                        logError_1 = _7.sent();
                        console.warn('TaskService.createTask: incident audit log failed.', logError_1);
                        return [3 /*break*/, 13];
                    case 13: return [2 /*return*/, tslib_1.__assign(tslib_1.__assign({}, ((_6 = raw === null || raw === void 0 ? void 0 : raw.data) !== null && _6 !== void 0 ? _6 : raw)), { id: createdId })];
                }
            });
        });
    };
    TaskService.prototype.updateTask = function (id, updates) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, listTitle, availableFields, incidentTypeFieldName, incidentContext, _a, payload, slaFieldMap, _i, slaFieldMap_1, _b, taskKey, spFieldName, isDateTimeField, rawValue, assigneeField;
            var _c, _d, _e, _f, _g, _h, _j, _k;
            return tslib_1.__generator(this, function (_l) {
                switch (_l.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, this.getTaskListTitle()];
                    case 1:
                        listTitle = _l.sent();
                        return [4 /*yield*/, this.getListFieldNames()];
                    case 2:
                        availableFields = _l.sent();
                        return [4 /*yield*/, this.getIncidentTypeFieldName()];
                    case 3:
                        incidentTypeFieldName = _l.sent();
                        if (!(updates.requestType === 'Incident' && updates.incidentTypeId)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.resolveIncidentContext(updates.incidentTypeId)];
                    case 4:
                        _a = _l.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        _a = null;
                        _l.label = 6;
                    case 6:
                        incidentContext = _a;
                        payload = {
                            Title: updates.title,
                            Status: updates.status,
                            Priority: (_c = incidentContext === null || incidentContext === void 0 ? void 0 : incidentContext.priority) !== null && _c !== void 0 ? _c : updates.priority,
                            Site: updates.site,
                            StartDate: this.validateDate(updates.startDate),
                            DueDate: this.validateDate(updates.dueDate),
                            Description: updates.description,
                            RequestType: updates.requestType,
                            Department: (incidentContext === null || incidentContext === void 0 ? void 0 : incidentContext.incidentType.department) || updates.department,
                        };
                        if (updates.requestType !== undefined) {
                            this.applyFieldIfAvailable(payload, availableFields, 'Type', updates.requestType);
                        }
                        this.applyFieldIfAvailable(payload, availableFields, 'Severity', updates.requestType === 'Task'
                            ? null
                            : (_e = (_d = incidentContext === null || incidentContext === void 0 ? void 0 : incidentContext.incidentType.severity) !== null && _d !== void 0 ? _d : updates.severity) !== null && _e !== void 0 ? _e : null);
                        this.applyFieldIfAvailable(payload, availableFields, 'Impact', (_f = updates.impact) !== null && _f !== void 0 ? _f : null);
                        this.applyFieldIfAvailable(payload, availableFields, 'AffectedService', (_g = updates.affectedService) !== null && _g !== void 0 ? _g : null);
                        if (updates.incidentTypeId !== undefined || updates.requestType === 'Task') {
                            this.applyLookupFieldIfAvailable(payload, incidentTypeFieldName, updates.requestType === 'Task'
                                ? null
                                : (_j = (_h = incidentContext === null || incidentContext === void 0 ? void 0 : incidentContext.incidentType.id) !== null && _h !== void 0 ? _h : updates.incidentTypeId) !== null && _j !== void 0 ? _j : null);
                        }
                        slaFieldMap = [
                            ['slaResponseMinutes', 'SLAResponseMinutes'],
                            ['slaResolutionMinutes', 'SLAResolutionMinutes'],
                            ['responseDueDate', 'ResponseDueDate'],
                            ['resolutionDueDate', 'ResolutionDueDate'],
                            ['slaDeadline', 'SLADeadline'],
                            ['slaStatus', 'SLAStatus'],
                        ];
                        for (_i = 0, slaFieldMap_1 = slaFieldMap; _i < slaFieldMap_1.length; _i++) {
                            _b = slaFieldMap_1[_i], taskKey = _b[0], spFieldName = _b[1];
                            if (updates[taskKey] !== undefined || updates.requestType === 'Task') {
                                isDateTimeField = ['ResponseDueDate', 'ResolutionDueDate', 'SLADeadline'].includes(spFieldName);
                                rawValue = updates.requestType === 'Task'
                                    ? null
                                    : isDateTimeField
                                        ? this.validateDateTime(updates[taskKey])
                                        : (_k = updates[taskKey]) !== null && _k !== void 0 ? _k : null;
                                this.applyFieldIfAvailable(payload, availableFields, spFieldName, rawValue);
                            }
                        }
                        return [4 /*yield*/, this.getAssigneeFieldConfig()];
                    case 7:
                        assigneeField = _l.sent();
                        if (updates.assignedToId !== undefined) {
                            this.applyAssigneeToPayload(payload, updates.assignedToId, assigneeField);
                        }
                        return [4 /*yield*/, sp.web.lists.getByTitle(listTitle).items.getById(id).update(payload)];
                    case 8:
                        _l.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TaskService.prototype.escalateIncidentIfNeeded = function (task) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var now, responseDueDate, resolutionDueDate, reason, sp, listTitle, availableFields, payload, currentUserId;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.normalizeRequestType(task.requestType) !== 'Incident')
                            return [2 /*return*/, false];
                        if (!task.id || task.status === 'Resolved' || task.status === 'Escalated')
                            return [2 /*return*/, false];
                        now = new Date();
                        responseDueDate = this.parseDate(task.responseDueDate);
                        resolutionDueDate = this.parseDate(task.resolutionDueDate);
                        reason = null;
                        if (resolutionDueDate && now > resolutionDueDate) {
                            reason = 'Resolution SLA Breached';
                        }
                        else if (responseDueDate && now > responseDueDate && task.status === 'New') {
                            reason = 'Response SLA Breached';
                        }
                        if (!reason)
                            return [2 /*return*/, false];
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, this.getTaskListTitle()];
                    case 1:
                        listTitle = _a.sent();
                        return [4 /*yield*/, this.getListFieldNames()];
                    case 2:
                        availableFields = _a.sent();
                        payload = { Status: 'Escalated' };
                        this.applyFieldIfAvailable(payload, availableFields, 'SLAStatus', 'Breached');
                        // task.id is typed as ITask['id'] (number) but the value coming from
                        // TaskBoard has been .toString()'d. Coerce it here to guarantee SP
                        // gets the numeric ID it requires.
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(listTitle)
                                .items.getById(Number(task.id))
                                .update(payload)];
                    case 3:
                        // task.id is typed as ITask['id'] (number) but the value coming from
                        // TaskBoard has been .toString()'d. Coerce it here to guarantee SP
                        // gets the numeric ID it requires.
                        _a.sent();
                        return [4 /*yield*/, this.getCurrentUserId()];
                    case 4:
                        currentUserId = _a.sent();
                        return [4 /*yield*/, this.addIncidentLog(Number(task.id), 'Escalation', 'SLA', null, reason, currentUserId)];
                    case 5:
                        _a.sent();
                        return [2 /*return*/, true];
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
    // ---------------------------------------------------------------------------
    // Private helpers — date validation
    // ---------------------------------------------------------------------------
    TaskService.prototype.validateDate = function (date) {
        if (!date)
            return null;
        var dateOnlyMatch = date.match(/^\d{4}-\d{2}-\d{2}/);
        if (dateOnlyMatch)
            return dateOnlyMatch[0];
        var parsed = new Date(date);
        return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
    };
    TaskService.prototype.validateDateTime = function (value) {
        if (!value)
            return null;
        var parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed.toISOString();
    };
    TaskService.prototype.parseDate = function (value) {
        if (!value)
            return null;
        var parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
    };
    // ---------------------------------------------------------------------------
    // Private helpers — list and field discovery (all promise-cached)
    // ---------------------------------------------------------------------------
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
            var sp, _i, TASK_LIST_TITLE_CANDIDATES_1, candidate, _a;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        _i = 0, TASK_LIST_TITLE_CANDIDATES_1 = TASK_LIST_TITLE_CANDIDATES;
                        _b.label = 1;
                    case 1:
                        if (!(_i < TASK_LIST_TITLE_CANDIDATES_1.length)) return [3 /*break*/, 6];
                        candidate = TASK_LIST_TITLE_CANDIDATES_1[_i];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, sp.web.lists.getByTitle(candidate).select('Id')()];
                    case 3:
                        _b.sent();
                        console.info("TaskService: resolved list title to \"".concat(candidate, "\""));
                        return [2 /*return*/, candidate];
                    case 4:
                        _a = _b.sent();
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6:
                        console.warn("TaskService: no list found matching candidates. Defaulting to \"".concat(TASK_LIST_TITLE_CANDIDATES[0], "\""));
                        return [2 /*return*/, TASK_LIST_TITLE_CANDIDATES[0]];
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
                            console.warn('TaskService: could not find an assignee field. Defaulting to "AssignedTo" (single-value).');
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
    // ---------------------------------------------------------------------------
    // Private helpers — payload construction
    // ---------------------------------------------------------------------------
    TaskService.prototype.applyAssigneeToPayload = function (payload, assignedToId, fieldConfig) {
        var fieldName = "".concat(fieldConfig.internalName, "Id");
        if (assignedToId == null) {
            payload[fieldName] = null;
            return;
        }
        payload[fieldName] = fieldConfig.isMulti
            ? { results: [assignedToId] }
            : assignedToId;
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
    // ---------------------------------------------------------------------------
    // Private helpers — SP user/lookup value extraction
    // ---------------------------------------------------------------------------
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
    // ---------------------------------------------------------------------------
    // Private helpers — field name normalization and search
    // ---------------------------------------------------------------------------
    TaskService.prototype.normalizeFieldName = function (value) {
        return (value !== null && value !== void 0 ? value : '')
            .replace(/_x0020_/gi, '')
            .replace(/\s+/g, '')
            .toLowerCase();
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
                return (normalizedInternalName === normalizedCandidate ||
                    normalizedTitle === normalizedCandidate);
            });
        });
    };
    // ---------------------------------------------------------------------------
    // Private helpers — type coercion
    // ---------------------------------------------------------------------------
    TaskService.prototype.normalizeRequestType = function (value) {
        return (value !== null && value !== void 0 ? value : '').toLowerCase() === 'incident' ? 'Incident' : 'Task';
    };
    TaskService.prototype.toWorkItemType = function (requestType) {
        return requestType === 'Incident' ? 'incident' : 'task';
    };
    // ---------------------------------------------------------------------------
    // Private helpers — incident context resolution
    // ---------------------------------------------------------------------------
    TaskService.prototype.resolveIncidentContext = function (incidentTypeId) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var incidentType;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!incidentTypeId) {
                            throw new Error('Incident Type is required before an incident can be saved.');
                        }
                        return [4 /*yield*/, this.getIncidentTypeById(incidentTypeId)];
                    case 1:
                        incidentType = _a.sent();
                        if (!(incidentType === null || incidentType === void 0 ? void 0 : incidentType.severity)) {
                            throw new Error("Incident Type ".concat(incidentTypeId, " is missing a valid severity."));
                        }
                        return [2 /*return*/, {
                                incidentType: incidentType,
                                priority: (0, incidentSla_1.getPriorityFromSeverity)(incidentType.severity),
                                sla: (0, incidentSla_1.buildIncidentSla)(incidentType.severity),
                            }];
                }
            });
        });
    };
    TaskService.prototype.getIncidentTypeById = function (incidentTypeId) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, item;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(INCIDENT_TYPE_LIST_TITLE)
                                .items.getById(incidentTypeId)
                                .select('Id', 'Title', 'Severity', 'Department', 'IsActive')()];
                    case 1:
                        item = _a.sent();
                        if (!(item === null || item === void 0 ? void 0 : item.Id) || !(item === null || item === void 0 ? void 0 : item.Title) || !(item === null || item === void 0 ? void 0 : item.Severity)) {
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/, {
                                id: item.Id,
                                title: item.Title,
                                severity: item.Severity,
                                department: item.Department,
                                isActive: item.IsActive === true || item.IsActive === 1,
                            }];
                }
            });
        });
    };
    // ---------------------------------------------------------------------------
    // Private helpers — incident audit logging
    // ---------------------------------------------------------------------------
    TaskService.prototype.getCurrentUserId = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, user, error_3;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, sp.web.currentUser()];
                    case 2:
                        user = _a.sent();
                        return [2 /*return*/, typeof (user === null || user === void 0 ? void 0 : user.Id) === 'number' ? user.Id : null];
                    case 3:
                        error_3 = _a.sent();
                        console.warn('TaskService: could not resolve current SP user ID for audit logging.', error_3);
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    TaskService.prototype.logIncidentCreation = function (workItemId, task, incidentContext, currentUserId) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _a;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0: 
                    // Sequential writes to avoid SP throttling on rapid consecutive POSTs.
                    return [4 /*yield*/, this.addIncidentLog(workItemId, 'Created', 'Incident', null, (_a = task.title) !== null && _a !== void 0 ? _a : null, currentUserId)];
                    case 1:
                        // Sequential writes to avoid SP throttling on rapid consecutive POSTs.
                        _b.sent();
                        return [4 /*yield*/, this.addIncidentLog(workItemId, 'FieldChange', 'IncidentType', null, incidentContext.incidentType.title, currentUserId)];
                    case 2:
                        _b.sent();
                        return [4 /*yield*/, this.addIncidentLog(workItemId, 'FieldChange', 'Severity', null, incidentContext.incidentType.severity, currentUserId)];
                    case 3:
                        _b.sent();
                        return [4 /*yield*/, this.addIncidentLog(workItemId, 'FieldChange', 'Priority', null, incidentContext.priority, currentUserId)];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, this.addIncidentLog(workItemId, 'SLA', 'ResponseDue', null, incidentContext.sla.responseDueDate, currentUserId)];
                    case 5:
                        _b.sent();
                        return [4 /*yield*/, this.addIncidentLog(workItemId, 'SLA', 'ResolutionDue', null, incidentContext.sla.resolutionDueDate, currentUserId)];
                    case 6:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Fetches the IncidentLogs field schema once and caches it for the lifetime
    // of this service instance. Every audit entry on the same page load reuses
    // the cached schema instead of hitting /_api/fields again.
    TaskService.prototype.getIncidentLogFieldSchema = function () {
        if (!this.incidentLogFieldSchemaPromise) {
            var sp = (0, pnpjsConfig_1.getSP)();
            this.incidentLogFieldSchemaPromise = sp.web.lists
                .getByTitle(INCIDENT_LOG_LIST_TITLE)
                .fields.select('InternalName', 'Title', 'TypeAsString')();
        }
        return this.incidentLogFieldSchemaPromise;
    };
    TaskService.prototype.addIncidentLog = function (workItemId, action, fieldName, oldValue, newValue, performedById) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, fields, workItemField, actionField, fieldNameField, oldValueField, newValueField, timestampField, performedByField, payload, isLookup, isUserField;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, this.getIncidentLogFieldSchema()];
                    case 1:
                        fields = _a.sent();
                        workItemField = this.findFieldByCandidates(fields, INCIDENT_LOG_WORKITEM_FIELD_CANDIDATES);
                        actionField = this.findFieldByCandidates(fields, INCIDENT_LOG_ACTION_FIELD_CANDIDATES);
                        fieldNameField = this.findFieldByCandidates(fields, INCIDENT_LOG_FIELDNAME_FIELD_CANDIDATES);
                        oldValueField = this.findFieldByCandidates(fields, INCIDENT_LOG_OLDVALUE_FIELD_CANDIDATES);
                        newValueField = this.findFieldByCandidates(fields, INCIDENT_LOG_NEWVALUE_FIELD_CANDIDATES);
                        timestampField = this.findFieldByCandidates(fields, INCIDENT_LOG_TIMESTAMP_FIELD_CANDIDATES);
                        performedByField = this.findFieldByCandidates(fields, INCIDENT_LOG_PERFORMEDBY_FIELD_CANDIDATES);
                        payload = {
                            Title: "".concat(fieldName, " ").concat(action),
                        };
                        if (workItemField) {
                            isLookup = workItemField.TypeAsString === 'Lookup' || workItemField.TypeAsString === 'LookupMulti';
                            payload[isLookup ? "".concat(workItemField.InternalName, "Id") : workItemField.InternalName] = workItemId;
                        }
                        if (actionField) {
                            payload[actionField.InternalName] = action;
                        }
                        if (fieldNameField) {
                            payload[fieldNameField.InternalName] = fieldName;
                        }
                        if (oldValueField) {
                            payload[oldValueField.InternalName] = oldValue == null ? null : String(oldValue);
                        }
                        if (newValueField) {
                            payload[newValueField.InternalName] = newValue == null ? null : String(newValue);
                        }
                        if (timestampField) {
                            payload[timestampField.InternalName] = new Date().toISOString();
                        }
                        if (performedByField && performedById) {
                            isUserField = performedByField.TypeAsString === 'User' || performedByField.TypeAsString === 'UserMulti';
                            if (isUserField) {
                                payload["".concat(performedByField.InternalName, "Id")] = performedByField.TypeAsString === 'UserMulti'
                                    ? { results: [performedById] }
                                    : performedById;
                            }
                            else {
                                payload[performedByField.InternalName] = performedById;
                            }
                        }
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(INCIDENT_LOG_LIST_TITLE)
                                .items.add(payload)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TaskService.prototype.getDepartmentLead = function (department) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, normalizedDepartment, sanitizedDepartment, roles, role;
            var _a, _b, _c;
            return tslib_1.__generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        normalizedDepartment = (department !== null && department !== void 0 ? department : '').trim().toLowerCase();
                        if (!normalizedDepartment)
                            return [2 /*return*/, null];
                        sanitizedDepartment = normalizedDepartment.replace(/'/g, "''");
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(USER_ROLE_LIST_TITLE)
                                .items
                                .select('User/Id', 'User/Title', 'User/EMail', 'Department', 'IsDepartmentLead', 'IsActive')
                                .expand('User')
                                .filter("tolower(Department) eq '".concat(sanitizedDepartment, "' and IsDepartmentLead eq 1 and IsActive eq 1"))
                                .top(1)()];
                    case 1:
                        roles = _d.sent();
                        role = roles[0];
                        if (!((_a = role === null || role === void 0 ? void 0 : role.User) === null || _a === void 0 ? void 0 : _a.Id))
                            return [2 /*return*/, null];
                        return [2 /*return*/, {
                                id: role.User.Id,
                                name: (_b = role.User.Title) !== null && _b !== void 0 ? _b : '',
                                email: (_c = role.User.EMail) !== null && _c !== void 0 ? _c : '',
                            }];
                }
            });
        });
    };
    TaskService.prototype.logSlaEscalation = function (workItemId, oldAssignedTo, newAssignedTo) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, fields, workItemField, actionField, oldValueField, newValueField, timestampField, payload, isLookup;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, this.getIncidentLogFieldSchema()];
                    case 1:
                        fields = _a.sent();
                        workItemField = this.findFieldByCandidates(fields, INCIDENT_LOG_WORKITEM_FIELD_CANDIDATES);
                        actionField = this.findFieldByCandidates(fields, INCIDENT_LOG_ACTION_FIELD_CANDIDATES);
                        oldValueField = this.findFieldByCandidates(fields, INCIDENT_LOG_OLDVALUE_FIELD_CANDIDATES);
                        newValueField = this.findFieldByCandidates(fields, INCIDENT_LOG_NEWVALUE_FIELD_CANDIDATES);
                        timestampField = this.findFieldByCandidates(fields, INCIDENT_LOG_TIMESTAMP_FIELD_CANDIDATES);
                        payload = {
                            Title: 'SLA Breached',
                        };
                        if (workItemField) {
                            isLookup = workItemField.TypeAsString === 'Lookup' || workItemField.TypeAsString === 'LookupMulti';
                            payload[isLookup ? "".concat(workItemField.InternalName, "Id") : workItemField.InternalName] = workItemId;
                        }
                        if (actionField) {
                            payload[actionField.InternalName] = 'Escalated';
                        }
                        if (oldValueField) {
                            payload[oldValueField.InternalName] = oldAssignedTo;
                        }
                        if (newValueField) {
                            payload[newValueField.InternalName] = newAssignedTo;
                        }
                        if (timestampField) {
                            payload[timestampField.InternalName] = new Date().toISOString();
                        }
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(INCIDENT_LOG_LIST_TITLE)
                                .items.add(payload)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return TaskService;
}());
exports.TaskService = TaskService;
//# sourceMappingURL=TaskService.js.map