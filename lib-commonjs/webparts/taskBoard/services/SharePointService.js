"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharePointService = void 0;
var tslib_1 = require("tslib");
// src/webparts/taskBoard/services/SharePointService.ts
var pnpjsConfig_1 = require("../../../pnpjsConfig");
require("@pnp/sp/webs");
require("@pnp/sp/lists");
require("@pnp/sp/items");
var SharePointService = /** @class */ (function () {
    function SharePointService() {
    }
    /**
     * Get all tasks from SharePoint
     */
    SharePointService.prototype.getTasks = function () {
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
                                .getByTitle("Task Management System")
                                .items
                                .select('Id', 'Title', 'AssignedTo/Id', 'AssignedTo/Title', 'AssignedTo/EMail', 'AssignedToId')
                                .expand('AssignedTo')
                                .orderBy('Created', false)
                                .top(500)()];
                    case 2:
                        items = _a.sent();
                        console.log('SharePointService.getTasks - raw items:', items);
                        return [2 /*return*/, items];
                    case 3:
                        error_1 = _a.sent();
                        console.error('SharePointService.getTasks - error:', error_1);
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get active incident types from SharePoint
     */
    SharePointService.prototype.getIncidentTypes = function (department) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, sanitizedDepartment, items, error_2;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        sanitizedDepartment = department.replace(/'/g, "''");
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle("IncidentTypes")
                                .items
                                .select('Id', 'Title', 'Severity', 'Department', 'IsActive')
                                .filter("Department eq '".concat(sanitizedDepartment, "' and IsActive eq 1"))
                                .orderBy('Title', true)()];
                    case 2:
                        items = _a.sent();
                        console.log('SharePointService.getIncidentTypes - raw items:', items);
                        return [2 /*return*/, items];
                    case 3:
                        error_2 = _a.sent();
                        console.error('SharePointService.getIncidentTypes - error:', error_2);
                        throw error_2;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create a new task in SharePoint
     */
    SharePointService.prototype.createTask = function (task) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, addData, result, error_3;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        console.log('SharePointService.createTask - payload:', task);
                        addData = {
                            Title: task.title || 'New Task',
                            Status: task.status || 'Unassigned',
                            Priority: task.priority || 'Medium',
                            RequestType: task.requestType || 'Task',
                            Department: task.department || 'IT',
                            Description: task.description || ''
                        };
                        if (task.assignedToId != null)
                            addData.AssignedToId = task.assignedToId;
                        if (task.startDate)
                            addData.StartDate = task.startDate;
                        if (task.dueDate)
                            addData.DueDate = task.dueDate;
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle("Task Management System")
                                .items
                                .add(addData)];
                    case 2:
                        result = _a.sent();
                        console.log('SharePointService.createTask - result:', result);
                        return [2 /*return*/, { id: result.data.Id }];
                    case 3:
                        error_3 = _a.sent();
                        console.error('SharePointService.createTask - error:', error_3);
                        throw error_3;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update an existing task in SharePoint
     */
    SharePointService.prototype.updateTask = function (id, task) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, updateData, error_4;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        updateData = {};
                        if (task.title !== undefined)
                            updateData.Title = task.title;
                        if (task.status !== undefined)
                            updateData.Status = task.status;
                        if (task.priority !== undefined)
                            updateData.Priority = task.priority;
                        if (task.requestType !== undefined)
                            updateData.RequestType = task.requestType;
                        if (task.department !== undefined)
                            updateData.Department = task.department;
                        if (task.description !== undefined)
                            updateData.Description = task.description;
                        if (task.startDate !== undefined)
                            updateData.StartDate = task.startDate;
                        if (task.dueDate !== undefined)
                            updateData.DueDate = task.dueDate;
                        if (task.assignedToId !== undefined) {
                            updateData.AssignedToId = task.assignedToId;
                        }
                        console.log('SharePointService.updateTask - id:', id, 'updateData:', updateData);
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle("Task Management System")
                                .items
                                .getById(id)
                                .update(updateData)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_4 = _a.sent();
                        console.error('SharePointService.updateTask - error:', error_4);
                        throw error_4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update only task status (for drag-and-drop)
     */
    SharePointService.prototype.updateTaskStatus = function (id, status) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, error_5;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle("Task Management System")
                                .items
                                .getById(id)
                                .update({ Status: status })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_5 = _a.sent();
                        console.error('SharePointService.updateTaskStatus - error:', error_5);
                        throw error_5;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Delete a task from SharePoint
     */
    SharePointService.prototype.deleteTask = function (id) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, error_6;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        console.log('SharePointService.deleteTask - id:', id);
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle("Task Management System")
                                .items
                                .getById(id)
                                .delete()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_6 = _a.sent();
                        console.error('SharePointService.deleteTask - error:', error_6);
                        throw error_6;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return SharePointService;
}());
exports.SharePointService = SharePointService;
//# sourceMappingURL=SharePointService.js.map