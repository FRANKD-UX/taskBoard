"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
var tslib_1 = require("tslib");
var pnpjsConfig_1 = require("../pnpjsConfig");
var TaskService = /** @class */ (function () {
    function TaskService() {
    }
    TaskService.prototype.getTasks = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, items;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle('Tasks')
                                .items.select('Id', 'Title', 'Status', 'Priority', 'StartDate', 'DueDate', 'Description', 'RequestType', 'Department', 'AssignedTo/Title', 'AssignedTo/Id')
                                .expand('AssignedTo')()];
                    case 1:
                        items = _a.sent();
                        return [2 /*return*/, items.map(function (item) {
                                var _a, _b;
                                return ({
                                    id: item.Id,
                                    title: item.Title,
                                    status: item.Status,
                                    priority: item.Priority,
                                    assignedTo: (_a = item.AssignedTo) === null || _a === void 0 ? void 0 : _a.Title,
                                    assignedToId: (_b = item.AssignedTo) === null || _b === void 0 ? void 0 : _b.Id,
                                    startDate: item.StartDate,
                                    dueDate: item.DueDate,
                                    description: item.Description,
                                    requestType: item.RequestType,
                                    department: item.Department
                                });
                            })];
                }
            });
        });
    };
    TaskService.prototype.createTask = function (task) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, payload, result;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        payload = {
                            Title: task.title,
                            Status: task.status,
                            Priority: task.priority,
                            DueDate: task.dueDate ? task.dueDate : null,
                            Description: task.description,
                            RequestType: task.requestType,
                            Department: task.department
                        };
                        if (task.assignedToId) {
                            payload.AssignedToId = task.assignedToId;
                        }
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle("Tasks")
                                .items.add(payload)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.data];
                }
            });
        });
    };
    TaskService.prototype.updateTask = function (id, updates) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, payload;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        payload = {
                            Title: updates.title,
                            Status: updates.status,
                            Priority: updates.priority,
                            StartDate: updates.startDate,
                            DueDate: updates.dueDate,
                            Description: updates.description,
                            RequestType: updates.requestType,
                            Department: updates.department
                        };
                        if (updates.assignedToId !== undefined) {
                            payload.AssignedToId = updates.assignedToId || null;
                        }
                        return [4 /*yield*/, sp.web.lists.getByTitle('Tasks').items.getById(id).update(payload)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TaskService.prototype.deleteTask = function (id) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, sp.web.lists.getByTitle('Tasks').items.getById(id).delete()];
                    case 1:
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