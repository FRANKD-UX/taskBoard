"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
var tslib_1 = require("tslib");
require("@pnp/sp/fields");
var pnpjsConfig_1 = require("../pnpjsConfig");
var TASK_LIST_TITLE_CANDIDATES = ['Tasks', 'Task Management System'];
var ASSIGNEE_FIELD_CANDIDATES = [
    'AssignedTo',
    'Assigned To',
    'AssignedUser',
    'Assigned User'
];
var TaskService = /** @class */ (function () {
    function TaskService() {
    }
    TaskService.prototype.getTasks = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, listTitle, assigneeField, assigneeLookupField, items;
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, this.getTaskListTitle()];
                    case 1:
                        listTitle = _a.sent();
                        return [4 /*yield*/, this.getAssigneeFieldConfig()];
                    case 2:
                        assigneeField = _a.sent();
                        assigneeLookupField = "".concat(assigneeField.internalName, "Id");
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(listTitle)
                                .items.select('Id', 'Title', 'Status', 'Priority', 'StartDate', 'DueDate', 'Description', 'RequestType', 'Department', "".concat(assigneeField.internalName, "/Title"), "".concat(assigneeField.internalName, "/Id"), "".concat(assigneeField.internalName, "/Email"), "".concat(assigneeField.internalName, "/EMail"), "".concat(assigneeField.internalName, "/LoginName"), assigneeLookupField)
                                .expand(assigneeField.internalName)()];
                    case 3:
                        items = _a.sent();
                        return [2 /*return*/, items.map(function (item) {
                                var _a, _b, _c;
                                var assignee = _this.getPrimaryAssignee(item[assigneeField.internalName]);
                                var fallbackAssigneeId = _this.getPrimaryAssigneeId(item[assigneeLookupField]);
                                return {
                                    id: item.Id,
                                    title: item.Title,
                                    status: item.Status,
                                    priority: item.Priority,
                                    assignedTo: assignee === null || assignee === void 0 ? void 0 : assignee.Title,
                                    assignedToId: (_b = (_a = assignee === null || assignee === void 0 ? void 0 : assignee.Id) !== null && _a !== void 0 ? _a : fallbackAssigneeId) !== null && _b !== void 0 ? _b : null,
                                    assignedToEmail: (_c = assignee === null || assignee === void 0 ? void 0 : assignee.Email) !== null && _c !== void 0 ? _c : assignee === null || assignee === void 0 ? void 0 : assignee.EMail,
                                    assignedToLoginName: assignee === null || assignee === void 0 ? void 0 : assignee.LoginName,
                                    startDate: item.StartDate,
                                    dueDate: item.DueDate,
                                    description: item.Description,
                                    requestType: item.RequestType,
                                    department: item.Department
                                };
                            })];
                }
            });
        });
    };
    TaskService.prototype.createTask = function (task) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, listTitle, payload, assigneeField, result;
            var _a;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, this.getTaskListTitle()];
                    case 1:
                        listTitle = _b.sent();
                        payload = {
                            Title: task.title,
                            Status: task.status,
                            Priority: task.priority,
                            StartDate: this.validateDate(task.startDate),
                            DueDate: this.validateDate(task.dueDate),
                            Description: task.description,
                            RequestType: task.requestType,
                            Department: task.department
                        };
                        return [4 /*yield*/, this.getAssigneeFieldConfig()];
                    case 2:
                        assigneeField = _b.sent();
                        this.applyAssigneeToPayload(payload, task.assignedToId, assigneeField);
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(listTitle)
                                .items.add(payload)];
                    case 3:
                        result = _b.sent();
                        return [2 /*return*/, tslib_1.__assign(tslib_1.__assign({}, result.data), { id: (_a = result.data.Id) !== null && _a !== void 0 ? _a : result.data.id })];
                }
            });
        });
    };
    TaskService.prototype.updateTask = function (id, updates) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, listTitle, payload, assigneeField;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, this.getTaskListTitle()];
                    case 1:
                        listTitle = _a.sent();
                        payload = {
                            Title: updates.title,
                            Status: updates.status,
                            Priority: updates.priority,
                            StartDate: this.validateDate(updates.startDate),
                            DueDate: this.validateDate(updates.dueDate),
                            Description: updates.description,
                            RequestType: updates.requestType,
                            Department: updates.department
                        };
                        return [4 /*yield*/, this.getAssigneeFieldConfig()];
                    case 2:
                        assigneeField = _a.sent();
                        if (updates.assignedToId !== undefined) {
                            this.applyAssigneeToPayload(payload, updates.assignedToId, assigneeField);
                        }
                        return [4 /*yield*/, sp.web.lists.getByTitle(listTitle).items.getById(id).update(payload)];
                    case 3:
                        _a.sent();
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
                            if (!(candidate === null || candidate === void 0 ? void 0 : candidate.InternalName)) {
                                return false;
                            }
                            if (candidate.TypeAsString !== 'User' && candidate.TypeAsString !== 'UserMulti') {
                                return false;
                            }
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
                                isMulti: field.AllowMultipleValues === true || field.TypeAsString === 'UserMulti'
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
        payload["".concat(fieldName, "Id")] = {
            results: [assignedToId]
        };
    };
    TaskService.prototype.getPrimaryAssignee = function (value) {
        if (!value) {
            return undefined;
        }
        return Array.isArray(value) ? value[0] : value;
    };
    TaskService.prototype.getPrimaryAssigneeId = function (value) {
        var _a;
        if (typeof value === 'number') {
            return value;
        }
        if (Array.isArray(value)) {
            return value[0];
        }
        return (_a = value === null || value === void 0 ? void 0 : value.results) === null || _a === void 0 ? void 0 : _a[0];
    };
    TaskService.prototype.normalizeFieldName = function (value) {
        return (value !== null && value !== void 0 ? value : '')
            .replace(/_x0020_/gi, '')
            .replace(/\s+/g, '')
            .toLowerCase();
    };
    return TaskService;
}());
exports.TaskService = TaskService;
//# sourceMappingURL=TaskService.js.map