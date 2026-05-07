"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
// TaskBoard.tsx
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var AppLayout_1 = tslib_1.__importDefault(require("./AppLayout"));
var BoardView_1 = tslib_1.__importDefault(require("./BoardView"));
var CalendarView_1 = tslib_1.__importDefault(require("./CalendarView"));
var ChartView_1 = tslib_1.__importDefault(require("./ChartView"));
var GanttView_1 = tslib_1.__importDefault(require("./GanttView"));
var ReportsView_1 = tslib_1.__importDefault(require("./ReportsView"));
var TableView_1 = tslib_1.__importDefault(require("./TableView"));
var incidentSla_1 = require("./incidentSla");
var theme_1 = require("./theme");
var WorkItemModal_1 = tslib_1.__importDefault(require("./WorkItemModal"));
var pnpjsConfig_1 = require("../../../pnpjsConfig");
var TaskService_1 = require("../../../services/TaskService");
var NotificationService_1 = require("../../../services/NotificationService");
var UserRoleService_1 = require("../../../services/UserRoleService");
var CollaboratorService_1 = require("../../../services/CollaboratorService");
var TEMP_ID_PREFIX = 'temp_';
var TASK_STATUSES = ['Unassigned', 'Backlog', 'ThisWeek', 'InProgress', 'Completed'];
var INCIDENT_STATUSES = ['New', 'Investigating', 'Escalated', 'Resolved'];
var VIEW_TABS = [
    { key: 'board', label: 'Board' },
    { key: 'table', label: 'Table' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'gantt', label: 'Gantt' },
    { key: 'chart', label: 'Chart' },
];
var POWER_BI_REPORTS = [
    {
        id: 'operations-overview',
        label: 'Operations Overview',
        reportId: '9e696574-3c3e-4c71-93ef-98146253db35',
        groupId: '0fce8c90-eb63-4080-b483-4e23534c0e6e',
        tenantId: '83223fdc-5c39-40ab-b34a-896fca28d3b2',
    },
];
// ---------------------------------------------------------------------------
// Pure type-mapping helpers
// ---------------------------------------------------------------------------
var toRequestType = function (type) {
    return type === 'incident' ? 'Incident' : 'Task';
};
var toWorkItemType = function (requestType) {
    return (requestType !== null && requestType !== void 0 ? requestType : '').toLowerCase() === 'incident' ? 'incident' : 'task';
};
var toTaskPriority = function (value) {
    if (value === 'Critical' || value === 'Low' || value === 'High')
        return value;
    return 'Medium';
};
var toTaskSite = function (value) {
    return value === 'Troyville' ? 'Troyville' : 'Albertsdal';
};
var toTaskStatus = function (value) {
    if (value && TASK_STATUSES.indexOf(value) > -1) {
        return value;
    }
    return 'Unassigned';
};
var toIncidentStatus = function (value) {
    if (value && INCIDENT_STATUSES.indexOf(value) > -1) {
        return value;
    }
    return 'New';
};
var toWorkItemStatus = function (value, type) {
    return type === 'incident' ? toIncidentStatus(value) : toTaskStatus(value);
};
var getStatusesForType = function (type) {
    return type === 'incident' ? INCIDENT_STATUSES : TASK_STATUSES;
};
var getTodayIso = function () {
    var d = new Date();
    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
    ].join('-');
};
// ---------------------------------------------------------------------------
// Drag-and-drop state helper
// ---------------------------------------------------------------------------
// NOTE: reorderTasksAfterDrag has been removed.
// The old react-beautiful-dnd gave us source/destination *indices* so we had
// to manually reorder arrays. dnd-kit gives us (taskId, newStatus) directly,
// so a simple map() over workItems is all we need — see handleTaskStatusChange.
// ---------------------------------------------------------------------------
// SharePoint user-resolution helpers
// ---------------------------------------------------------------------------
var resolveUserNameFromId = function (userId) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var sp, user, _a, userInfo, _b;
    return tslib_1.__generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                sp = (0, pnpjsConfig_1.getSP)();
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 8]);
                return [4 /*yield*/, sp.web.siteUsers.getById(userId)()];
            case 2:
                user = _c.sent();
                return [2 /*return*/, (user === null || user === void 0 ? void 0 : user.Title) || null];
            case 3:
                _a = _c.sent();
                _c.label = 4;
            case 4:
                _c.trys.push([4, 6, , 7]);
                return [4 /*yield*/, sp.web.siteUserInfoList.items
                        .filter("Id eq ".concat(userId))
                        .select('Id,Title')
                        .top(1)()];
            case 5:
                userInfo = _c.sent();
                if (userInfo && userInfo.length > 0) {
                    return [2 /*return*/, userInfo[0].Title];
                }
                return [3 /*break*/, 7];
            case 6:
                _b = _c.sent();
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/, null];
            case 8: return [2 /*return*/];
        }
    });
}); };
var resolveSharePointUserId = function (email, loginName) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var sp, result, _a, result, _b, userInfo, _c;
    return tslib_1.__generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                sp = (0, pnpjsConfig_1.getSP)();
                if (!email) return [3 /*break*/, 4];
                _d.label = 1;
            case 1:
                _d.trys.push([1, 3, , 4]);
                return [4 /*yield*/, sp.web.ensureUser(email)];
            case 2:
                result = _d.sent();
                if (result === null || result === void 0 ? void 0 : result.Id)
                    return [2 /*return*/, result.Id];
                return [3 /*break*/, 4];
            case 3:
                _a = _d.sent();
                return [3 /*break*/, 4];
            case 4:
                if (!loginName) return [3 /*break*/, 8];
                _d.label = 5;
            case 5:
                _d.trys.push([5, 7, , 8]);
                return [4 /*yield*/, sp.web.ensureUser(loginName)];
            case 6:
                result = _d.sent();
                if (result === null || result === void 0 ? void 0 : result.Id)
                    return [2 /*return*/, result.Id];
                return [3 /*break*/, 8];
            case 7:
                _b = _d.sent();
                return [3 /*break*/, 8];
            case 8:
                if (!email) return [3 /*break*/, 12];
                _d.label = 9;
            case 9:
                _d.trys.push([9, 11, , 12]);
                return [4 /*yield*/, sp.web.siteUserInfoList.items
                        .filter("UserName eq '".concat(email, "'"))
                        .select('Id')
                        .top(1)()];
            case 10:
                userInfo = _d.sent();
                if (userInfo && userInfo.length > 0)
                    return [2 /*return*/, userInfo[0].Id];
                return [3 /*break*/, 12];
            case 11:
                _c = _d.sent();
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/, null];
        }
    });
}); };
var fetchCollaborationTaskIds = function (userId) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var collabService, ids, _a;
    return tslib_1.__generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                collabService = new CollaboratorService_1.CollaboratorService();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, collabService.getAcceptedTaskIdsForUser(userId)];
            case 2:
                ids = _b.sent();
                return [2 /*return*/, new Set(ids.map(String))];
            case 3:
                _a = _b.sent();
                return [2 /*return*/, new Set()];
            case 4: return [2 /*return*/];
        }
    });
}); };
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
var TaskBoard = function (_a) {
    var context = _a.context;
    var _b = (0, react_1.useState)([]), workItems = _b[0], setWorkItems = _b[1];
    var _c = (0, react_1.useState)(null), modalTask = _c[0], setModalTask = _c[1];
    var _d = (0, react_1.useState)('dashboard'), selectedView = _d[0], setSelectedView = _d[1];
    var _e = (0, react_1.useState)('board'), activeView = _e[0], setActiveView = _e[1];
    var _f = (0, react_1.useState)('board'), displayedView = _f[0], setDisplayedView = _f[1];
    var _g = (0, react_1.useState)(true), isViewVisible = _g[0], setIsViewVisible = _g[1];
    var _h = (0, react_1.useState)(null), hoveredTab = _h[0], setHoveredTab = _h[1];
    var _j = (0, react_1.useState)(false), canAssign = _j[0], setCanAssign = _j[1];
    var _k = (0, react_1.useState)(''), currentUserName = _k[0], setCurrentUserName = _k[1];
    var _l = (0, react_1.useState)(''), currentUserEmail = _l[0], setCurrentUserEmail = _l[1];
    var _m = (0, react_1.useState)(null), currentUserSpId = _m[0], setCurrentUserSpId = _m[1];
    var _o = (0, react_1.useState)(true), isLoading = _o[0], setIsLoading = _o[1];
    var _p = (0, react_1.useState)(''), currentUserRole = _p[0], setCurrentUserRole = _p[1];
    var _q = (0, react_1.useState)(''), currentUserDepartment = _q[0], setCurrentUserDepartment = _q[1];
    var taskService = (0, react_1.useMemo)(function () { return new TaskService_1.TaskService(); }, []);
    var taskItems = (0, react_1.useMemo)(function () { return workItems.filter(function (item) { return item.type === 'task'; }); }, [workItems]);
    var incidentItems = (0, react_1.useMemo)(function () { return workItems.filter(function (item) { return item.type === 'incident'; }); }, [workItems]);
    // -----------------------------------------------------------------------
    // Initialisation
    // -----------------------------------------------------------------------
    (0, react_1.useEffect)(function () {
        window.spfxContext = context;
        (0, pnpjsConfig_1.initSP)(context);
    }, [context]);
    var mapServiceItemToTask = React.useCallback(function (item, createdByFallback) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var type, priority, assignedToName, userId, resolvedName;
        var _a, _b, _c, _d;
        return tslib_1.__generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    type = item.type || toWorkItemType(item.requestType);
                    priority = type === 'incident' && item.severity
                        ? (0, incidentSla_1.getPriorityFromSeverity)(item.severity)
                        : toTaskPriority(item.priority);
                    assignedToName = '';
                    if (item.assignedTo) {
                        if (typeof item.assignedTo === 'object') {
                            assignedToName = item.assignedTo.Title || item.assignedTo.Name || '';
                        }
                        else {
                            assignedToName = String(item.assignedTo);
                        }
                    }
                    if (!!assignedToName) return [3 /*break*/, 2];
                    userId = item.assignedToId;
                    if (!(userId && userId > 0)) return [3 /*break*/, 2];
                    return [4 /*yield*/, resolveUserNameFromId(userId)];
                case 1:
                    resolvedName = _e.sent();
                    if (resolvedName)
                        assignedToName = resolvedName;
                    _e.label = 2;
                case 2:
                    if (!assignedToName && item.assignedToEmail) {
                        assignedToName = item.assignedToEmail.split('@')[0] || item.assignedToEmail;
                    }
                    return [2 /*return*/, {
                            id: item.id.toString(),
                            type: type,
                            title: item.title,
                            status: toWorkItemStatus(item.status, type),
                            priority: priority,
                            site: toTaskSite(item.site),
                            assignedTo: assignedToName,
                            assignedToUser: assignedToName
                                ? { id: (_a = item.assignedToId) !== null && _a !== void 0 ? _a : null, name: assignedToName, email: (_b = item.assignedToEmail) !== null && _b !== void 0 ? _b : '' }
                                : undefined,
                            assignedToId: (_c = item.assignedToId) !== null && _c !== void 0 ? _c : undefined,
                            assignedToEmail: item.assignedToEmail,
                            assignedToLoginName: item.assignedToLoginName,
                            startDate: item.startDate,
                            dueDate: item.dueDate,
                            createdAt: item.createdAt || new Date().toISOString(),
                            requestType: toRequestType(type),
                            department: item.department || 'IT',
                            description: item.description,
                            createdBy: item.createdBy || createdByFallback,
                            authorId: (_d = item.authorId) !== null && _d !== void 0 ? _d : null,
                            severity: item.severity,
                            impact: item.impact,
                            affectedService: item.affectedService,
                            incidentTypeId: item.incidentTypeId,
                            incidentType: item.incidentType,
                            slaResponseMinutes: item.slaResponseMinutes,
                            slaResolutionMinutes: item.slaResolutionMinutes,
                            responseDueDate: item.responseDueDate,
                            resolutionDueDate: item.resolutionDueDate,
                            slaDeadline: item.slaDeadline,
                            slaStatus: item.slaStatus,
                        }];
            }
        });
    }); }, []);
    var filterVisibleTasks = function (allTasks, userId, role, department) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var collaborationTaskIds, isManagerOrLead;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchCollaborationTaskIds(userId)];
                case 1:
                    collaborationTaskIds = _a.sent();
                    isManagerOrLead = role === 'Manager' || role === 'TeamLead';
                    return [2 /*return*/, allTasks.filter(function (task) {
                            if (task.type === 'incident' && isManagerOrLead && task.department === department) {
                                return true;
                            }
                            if (task.authorId === userId)
                                return true;
                            if (task.assignedToId === userId)
                                return true;
                            if (collaborationTaskIds.has(task.id))
                                return true;
                            return false;
                        })];
            }
        });
    }); };
    var loadAndMapTasks = function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var sp, user_1, userId, items, mappedTasks, visibleTasks, error_1;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!taskService)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, , 9]);
                    sp = (0, pnpjsConfig_1.getSP)();
                    return [4 /*yield*/, sp.web.currentUser()];
                case 2:
                    user_1 = _a.sent();
                    userId = user_1.Id;
                    setCurrentUserName(user_1.Title || '');
                    setCurrentUserEmail(user_1.Email || '');
                    setCurrentUserSpId(userId !== null && userId !== void 0 ? userId : null);
                    return [4 /*yield*/, taskService.getTasks()];
                case 3:
                    items = _a.sent();
                    return [4 /*yield*/, Promise.all(items.map(function (item) { return mapServiceItemToTask(item, user_1.Title || ''); }))];
                case 4:
                    mappedTasks = _a.sent();
                    if (!userId) return [3 /*break*/, 6];
                    return [4 /*yield*/, filterVisibleTasks(mappedTasks, userId, currentUserRole, currentUserDepartment)];
                case 5:
                    visibleTasks = _a.sent();
                    setWorkItems(visibleTasks);
                    return [3 /*break*/, 7];
                case 6:
                    setWorkItems(mappedTasks);
                    _a.label = 7;
                case 7: return [3 /*break*/, 9];
                case 8:
                    error_1 = _a.sent();
                    console.error('TaskBoard: load failed', error_1);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    }); };
    (0, react_1.useEffect)(function () {
        var initialize = function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
            var sp, user, role, roleError_1, notificationService, error_2;
            var _a, _b, _c;
            return tslib_1.__generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 8, 9, 10]);
                        setIsLoading(true);
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, sp.web.currentUser()];
                    case 1:
                        user = _d.sent();
                        setCurrentUserName(user.Title || '');
                        setCurrentUserEmail(user.Email || '');
                        setCurrentUserSpId((_a = user.Id) !== null && _a !== void 0 ? _a : null);
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, (0, UserRoleService_1.getUserRole)(user.Email || '')];
                    case 3:
                        role = _d.sent();
                        setCanAssign((role === null || role === void 0 ? void 0 : role.canAssign) === true);
                        setCurrentUserRole((_b = role === null || role === void 0 ? void 0 : role.role) !== null && _b !== void 0 ? _b : '');
                        setCurrentUserDepartment((_c = role === null || role === void 0 ? void 0 : role.department) !== null && _c !== void 0 ? _c : '');
                        return [3 /*break*/, 5];
                    case 4:
                        roleError_1 = _d.sent();
                        console.warn('TaskBoard: role lookup failed; defaulting to read-only assignment', roleError_1);
                        setCanAssign(false);
                        return [3 /*break*/, 5];
                    case 5:
                        notificationService = new NotificationService_1.NotificationService(context);
                        taskService.setNotificationService(notificationService);
                        return [4 /*yield*/, taskService.checkAndEscalateSLAs()];
                    case 6:
                        _d.sent();
                        return [4 /*yield*/, loadAndMapTasks()];
                    case 7:
                        _d.sent();
                        return [3 /*break*/, 10];
                    case 8:
                        error_2 = _d.sent();
                        console.error('TaskBoard: initial load failed', error_2);
                        return [3 /*break*/, 10];
                    case 9:
                        setIsLoading(false);
                        return [7 /*endfinally*/];
                    case 10: return [2 /*return*/];
                }
            });
        }); };
        initialize();
    }, [context]);
    // Periodic background refresh (every 60 seconds)
    (0, react_1.useEffect)(function () {
        if (isLoading || !currentUserSpId)
            return;
        var interval = setInterval(function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
            var items, mapped, visibleTasks, error_3;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, taskService.checkAndEscalateSLAs()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, taskService.getTasks()];
                    case 2:
                        items = _a.sent();
                        return [4 /*yield*/, Promise.all(items.map(function (item) { return mapServiceItemToTask(item, currentUserName); }))];
                    case 3:
                        mapped = _a.sent();
                        return [4 /*yield*/, filterVisibleTasks(mapped, currentUserSpId, currentUserRole, currentUserDepartment)];
                    case 4:
                        visibleTasks = _a.sent();
                        setWorkItems(visibleTasks);
                        return [3 /*break*/, 6];
                    case 5:
                        error_3 = _a.sent();
                        console.error('TaskBoard: periodic refresh failed', error_3);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        }); }, 60000);
        return function () { return clearInterval(interval); };
    }, [isLoading, currentUserSpId, currentUserName, taskService, mapServiceItemToTask, currentUserRole, currentUserDepartment]);
    // Tab switch fade animation
    (0, react_1.useEffect)(function () {
        if (activeView === displayedView)
            return;
        setIsViewVisible(false);
        var timer = setTimeout(function () {
            setDisplayedView(activeView);
            setIsViewVisible(true);
        }, 120);
        return function () { return clearTimeout(timer); };
    }, [activeView, displayedView]);
    // -----------------------------------------------------------------------
    // Drag-and-drop
    // -----------------------------------------------------------------------
    // Called by BoardView after a card is dropped onto a different column.
    // BoardView has already done the optimistic UI update for itself; here we
    // only need to persist the change to SharePoint and roll back on failure.
    var handleTaskStatusChange = function (taskId, newStatus) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var draggedItem, statuses, error_4;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    draggedItem = workItems.find(function (item) { return item.id === taskId; });
                    if (!draggedItem)
                        return [2 /*return*/];
                    statuses = getStatusesForType(draggedItem.type);
                    if (statuses.indexOf(newStatus) === -1)
                        return [2 /*return*/];
                    // Optimistic update: reflect the new status in local state immediately
                    // so the board stays in sync even if the API call takes a moment.
                    setWorkItems(function (current) {
                        return current.map(function (task) {
                            return task.id === taskId ? tslib_1.__assign(tslib_1.__assign({}, task), { status: newStatus }) : task;
                        });
                    });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, taskService.updateTask(Number(taskId), {
                            status: newStatus,
                            requestType: toRequestType(draggedItem.type),
                            severity: draggedItem.severity,
                            impact: draggedItem.impact,
                            affectedService: draggedItem.affectedService,
                        })];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_4 = _a.sent();
                    console.error('TaskBoard: background status update failed – rolling back', error_4);
                    // Rollback: restore the task to its previous status.
                    setWorkItems(function (current) {
                        return current.map(function (task) {
                            return task.id === taskId ? tslib_1.__assign(tslib_1.__assign({}, task), { status: draggedItem.status }) : task;
                        });
                    });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    // -----------------------------------------------------------------------
    // Task CRUD handlers
    // -----------------------------------------------------------------------
    var handleTaskClick = function (task) {
        setModalTask(task);
    };
    var handleNewTask = function (status, type) {
        var today = getTodayIso();
        var draft = {
            id: "".concat(TEMP_ID_PREFIX).concat(Date.now()),
            type: type,
            title: '',
            status: status,
            priority: 'Medium',
            site: 'Albertsdal',
            startDate: today,
            dueDate: undefined,
            createdAt: new Date().toISOString(),
            requestType: toRequestType(type),
            department: 'IT',
            description: '',
            assignedTo: canAssign ? '' : currentUserName,
            assignedToEmail: canAssign ? undefined : currentUserEmail,
            createdBy: currentUserName,
            severity: undefined,
            impact: type === 'incident' ? '' : undefined,
            affectedService: type === 'incident' ? '' : undefined,
            incidentTypeId: undefined,
            incidentType: null,
            slaResponseMinutes: undefined,
            slaResolutionMinutes: undefined,
            responseDueDate: undefined,
            resolutionDueDate: undefined,
            slaDeadline: undefined,
            slaStatus: undefined,
        };
        setModalTask(draft);
    };
    var handleCloseModal = function () {
        setModalTask(null);
    };
    var handleSaveTask = function (task) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var isNew, existingTask, effectiveTask_1, finalAssigneeId, finalAssigneeName, resolved, incidentType, incidentTypeId, derivedSeverity, derivedPriority, derivedDepartment, normaliseDate, shouldRebuildIncidentSla, incidentSla, payload, created, returnedId, items, mapped, persisted_1, updated_1, error_5;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        return tslib_1.__generator(this, function (_o) {
            switch (_o.label) {
                case 0:
                    _o.trys.push([0, 9, , 10]);
                    isNew = task.id.startsWith(TEMP_ID_PREFIX);
                    existingTask = isNew ? null : (_a = workItems.find(function (item) { return item.id === task.id; })) !== null && _a !== void 0 ? _a : null;
                    effectiveTask_1 = !canAssign
                        ? tslib_1.__assign(tslib_1.__assign({}, task), { assignedTo: currentUserName, assignedToEmail: currentUserEmail, assignedToId: undefined, assignedToLoginName: undefined }) : task;
                    finalAssigneeId = (_b = effectiveTask_1.assignedToId) !== null && _b !== void 0 ? _b : null;
                    finalAssigneeName = effectiveTask_1.assignedTo || '';
                    if (!((!finalAssigneeId || finalAssigneeId <= 0) &&
                        (effectiveTask_1.assignedToEmail || effectiveTask_1.assignedToLoginName))) return [3 /*break*/, 2];
                    return [4 /*yield*/, resolveSharePointUserId(effectiveTask_1.assignedToEmail || '', effectiveTask_1.assignedToLoginName || '')];
                case 1:
                    resolved = _o.sent();
                    if (resolved)
                        finalAssigneeId = resolved;
                    _o.label = 2;
                case 2:
                    if (!finalAssigneeId || finalAssigneeId <= 0) {
                        if (effectiveTask_1.assignedToEmail || effectiveTask_1.assignedToLoginName || effectiveTask_1.assignedTo) {
                            throw new Error('Could not resolve selected user to a SharePoint account. Select a valid user and try again.');
                        }
                        finalAssigneeId = null;
                        finalAssigneeName = '';
                    }
                    incidentType = effectiveTask_1.type === 'incident'
                        ? (_c = effectiveTask_1.incidentType) !== null && _c !== void 0 ? _c : null
                        : null;
                    incidentTypeId = effectiveTask_1.type === 'incident'
                        ? (_e = (_d = incidentType === null || incidentType === void 0 ? void 0 : incidentType.id) !== null && _d !== void 0 ? _d : effectiveTask_1.incidentTypeId) !== null && _e !== void 0 ? _e : null
                        : null;
                    derivedSeverity = effectiveTask_1.type === 'incident'
                        ? (_f = incidentType === null || incidentType === void 0 ? void 0 : incidentType.severity) !== null && _f !== void 0 ? _f : effectiveTask_1.severity
                        : undefined;
                    derivedPriority = effectiveTask_1.type === 'incident'
                        ? (0, incidentSla_1.getPriorityFromSeverity)(derivedSeverity)
                        : effectiveTask_1.priority;
                    derivedDepartment = effectiveTask_1.type === 'incident'
                        ? (incidentType === null || incidentType === void 0 ? void 0 : incidentType.department) || effectiveTask_1.department || 'IT'
                        : effectiveTask_1.department || 'IT';
                    if (effectiveTask_1.type === 'incident' && (!incidentTypeId || !derivedSeverity)) {
                        throw new Error('Incident Type is required before an incident can be created.');
                    }
                    normaliseDate = function (value) {
                        if (!value)
                            return '';
                        if (/^\d{4}-\d{2}-\d{2}$/.test(value))
                            return value;
                        var parsed = new Date(value);
                        return isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
                    };
                    shouldRebuildIncidentSla = effectiveTask_1.type === 'incident' &&
                        Boolean(derivedSeverity) &&
                        (isNew ||
                            (existingTask === null || existingTask === void 0 ? void 0 : existingTask.incidentTypeId) !== incidentTypeId ||
                            !(existingTask === null || existingTask === void 0 ? void 0 : existingTask.responseDueDate) ||
                            !(existingTask === null || existingTask === void 0 ? void 0 : existingTask.resolutionDueDate));
                    incidentSla = shouldRebuildIncidentSla && derivedSeverity
                        ? (0, incidentSla_1.buildIncidentSla)(derivedSeverity)
                        : null;
                    payload = {
                        title: effectiveTask_1.title,
                        status: effectiveTask_1.status,
                        priority: derivedPriority,
                        site: effectiveTask_1.site || 'Albertsdal',
                        assignedToId: finalAssigneeId,
                        startDate: normaliseDate(effectiveTask_1.startDate) || getTodayIso(),
                        dueDate: normaliseDate(effectiveTask_1.dueDate),
                        description: effectiveTask_1.description || '',
                        requestType: toRequestType(effectiveTask_1.type),
                        department: derivedDepartment,
                        severity: effectiveTask_1.type === 'incident' ? derivedSeverity : undefined,
                        impact: effectiveTask_1.type === 'incident' ? effectiveTask_1.impact || '' : undefined,
                        affectedService: effectiveTask_1.type === 'incident' ? effectiveTask_1.affectedService || '' : undefined,
                        incidentTypeId: effectiveTask_1.type === 'incident' ? incidentTypeId : null,
                        incidentType: effectiveTask_1.type === 'incident' ? incidentType : null,
                        slaResponseMinutes: (_g = incidentSla === null || incidentSla === void 0 ? void 0 : incidentSla.responseMinutes) !== null && _g !== void 0 ? _g : effectiveTask_1.slaResponseMinutes,
                        slaResolutionMinutes: (_h = incidentSla === null || incidentSla === void 0 ? void 0 : incidentSla.resolutionMinutes) !== null && _h !== void 0 ? _h : effectiveTask_1.slaResolutionMinutes,
                        responseDueDate: (_j = incidentSla === null || incidentSla === void 0 ? void 0 : incidentSla.responseDueDate) !== null && _j !== void 0 ? _j : effectiveTask_1.responseDueDate,
                        resolutionDueDate: (_k = incidentSla === null || incidentSla === void 0 ? void 0 : incidentSla.resolutionDueDate) !== null && _k !== void 0 ? _k : effectiveTask_1.resolutionDueDate,
                        slaDeadline: (_l = incidentSla === null || incidentSla === void 0 ? void 0 : incidentSla.deadline) !== null && _l !== void 0 ? _l : effectiveTask_1.slaDeadline,
                        slaStatus: (_m = incidentSla === null || incidentSla === void 0 ? void 0 : incidentSla.status) !== null && _m !== void 0 ? _m : effectiveTask_1.slaStatus,
                    };
                    if (!isNew) return [3 /*break*/, 7];
                    return [4 /*yield*/, taskService.createTask(payload)];
                case 3:
                    created = _o.sent();
                    returnedId = (created === null || created === void 0 ? void 0 : created.id) != null ? created.id.toString() : undefined;
                    if (!!returnedId) return [3 /*break*/, 6];
                    return [4 /*yield*/, taskService.getTasks()];
                case 4:
                    items = _o.sent();
                    return [4 /*yield*/, Promise.all(items.map(function (item) { return mapServiceItemToTask(item, currentUserName); }))];
                case 5:
                    mapped = _o.sent();
                    setWorkItems(mapped);
                    return [2 /*return*/, tslib_1.__assign(tslib_1.__assign({}, effectiveTask_1), { id: "recovered_".concat(Date.now()) })];
                case 6:
                    persisted_1 = tslib_1.__assign(tslib_1.__assign({}, effectiveTask_1), { id: returnedId, priority: derivedPriority, assignedTo: finalAssigneeName, assignedToId: finalAssigneeId !== null && finalAssigneeId !== void 0 ? finalAssigneeId : undefined, startDate: payload.startDate, dueDate: payload.dueDate, requestType: toRequestType(effectiveTask_1.type), createdBy: currentUserName, department: derivedDepartment, severity: derivedSeverity, incidentTypeId: incidentTypeId, incidentType: incidentType, slaResponseMinutes: payload.slaResponseMinutes, slaResolutionMinutes: payload.slaResolutionMinutes, responseDueDate: payload.responseDueDate, resolutionDueDate: payload.resolutionDueDate, slaDeadline: payload.slaDeadline, slaStatus: payload.slaStatus });
                    setWorkItems(function (prev) { return tslib_1.__spreadArray(tslib_1.__spreadArray([], prev, true), [persisted_1], false); });
                    return [2 /*return*/, persisted_1];
                case 7: return [4 /*yield*/, taskService.updateTask(Number(effectiveTask_1.id), payload)];
                case 8:
                    _o.sent();
                    updated_1 = tslib_1.__assign(tslib_1.__assign({}, effectiveTask_1), { priority: derivedPriority, assignedTo: finalAssigneeName, assignedToId: finalAssigneeId !== null && finalAssigneeId !== void 0 ? finalAssigneeId : undefined, startDate: payload.startDate, dueDate: payload.dueDate, requestType: toRequestType(effectiveTask_1.type), department: derivedDepartment, severity: derivedSeverity, incidentTypeId: incidentTypeId, incidentType: incidentType, slaResponseMinutes: payload.slaResponseMinutes, slaResolutionMinutes: payload.slaResolutionMinutes, responseDueDate: payload.responseDueDate, resolutionDueDate: payload.resolutionDueDate, slaDeadline: payload.slaDeadline, slaStatus: payload.slaStatus });
                    setWorkItems(function (prev) {
                        return prev.map(function (item) { return (item.id === effectiveTask_1.id ? updated_1 : item); });
                    });
                    return [2 /*return*/, updated_1];
                case 9:
                    error_5 = _o.sent();
                    console.error('TaskBoard: saveTask failed', error_5);
                    if (error_5 instanceof Error)
                        throw error_5;
                    throw new Error('Could not save work item to SharePoint.');
                case 10: return [2 /*return*/];
            }
        });
    }); };
    var handleDeleteTask = function (id) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var error_6;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    if (!!id.startsWith(TEMP_ID_PREFIX)) return [3 /*break*/, 2];
                    return [4 /*yield*/, taskService.deleteTask(Number(id))];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    setWorkItems(function (prev) { return prev.filter(function (item) { return item.id !== id; }); });
                    return [3 /*break*/, 4];
                case 3:
                    error_6 = _a.sent();
                    console.error('TaskBoard: delete failed', error_6);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleUpdateTask = function (id, updates) {
        var nextUpdates = updates;
        if (!canAssign && updates.assignedTo !== undefined) {
            var assignedTo = updates.assignedTo, assignedToId = updates.assignedToId, assignedToEmail = updates.assignedToEmail, assignedToLoginName = updates.assignedToLoginName, rest = tslib_1.__rest(updates, ["assignedTo", "assignedToId", "assignedToEmail", "assignedToLoginName"]);
            nextUpdates = rest;
        }
        setWorkItems(function (prev) {
            return prev.map(function (item) { return (item.id === id ? tslib_1.__assign(tslib_1.__assign({}, item), nextUpdates) : item); });
        });
    };
    // -----------------------------------------------------------------------
    // Render helpers
    // -----------------------------------------------------------------------
    var renderLoadingState = function (message) { return (React.createElement("div", { style: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '300px',
            color: theme_1.THEME.colors.textSecondary,
            backgroundColor: theme_1.THEME.colors.panel,
            border: "1px solid ".concat(theme_1.THEME.colors.border),
            borderRadius: '16px',
        } }, message)); };
    var renderWorkspaceHeader = function (title, description) { return (React.createElement("div", { style: {
            backgroundColor: theme_1.THEME.colors.panel,
            border: "1px solid ".concat(theme_1.THEME.colors.border),
            borderRadius: '16px',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
        } },
        React.createElement("h1", { style: { margin: 0, fontSize: '24px', color: theme_1.THEME.colors.textStrong } }, title),
        React.createElement("p", { style: { margin: '8px 0 0 0', color: theme_1.THEME.colors.textSecondary, fontSize: '14px' } }, description))); };
    var renderTaskWorkspaceView = function (view) {
        if (isLoading)
            return renderLoadingState('Loading tasks...');
        switch (view) {
            case 'board':
                return (React.createElement(BoardView_1.default, { tasks: taskItems, statuses: TASK_STATUSES, type: "task", onTaskClick: handleTaskClick, onNewTask: handleNewTask, onTaskStatusChange: handleTaskStatusChange }));
            case 'table':
                return (React.createElement(TableView_1.default, { tasks: taskItems, statuses: TASK_STATUSES, updateTask: handleUpdateTask, deleteTask: handleDeleteTask, canAssign: canAssign }));
            case 'calendar':
                return (React.createElement(CalendarView_1.default, { tasks: taskItems, onTaskClick: function (id) {
                        var task = taskItems.find(function (item) { return item.id === id; });
                        if (task)
                            handleTaskClick(task);
                    } }));
            case 'gantt':
                return (React.createElement(GanttView_1.default, { tasks: taskItems, statuses: TASK_STATUSES, onTaskClick: function (id) {
                        var task = taskItems.find(function (item) { return item.id === id; });
                        if (task)
                            handleTaskClick(task);
                    } }));
            case 'chart':
                return React.createElement(ChartView_1.default, { tasks: taskItems, statuses: TASK_STATUSES });
            default:
                return React.createElement(React.Fragment, null);
        }
    };
    var renderTasksView = function () { return (React.createElement("div", { style: { display: 'grid', gap: '16px' } },
        renderWorkspaceHeader('Tasks', 'Operational planning, delivery tracking, and cross-team execution.'),
        React.createElement("div", { style: {
                backgroundColor: theme_1.THEME.colors.panel,
                border: "1px solid ".concat(theme_1.THEME.colors.border),
                borderRadius: '16px',
                overflow: 'hidden',
            } },
            React.createElement("div", { style: {
                    display: 'flex',
                    gap: '4px',
                    padding: '12px 16px 0 16px',
                    backgroundColor: theme_1.THEME.colors.panel,
                    borderBottom: "1px solid ".concat(theme_1.THEME.colors.border),
                } }, VIEW_TABS.map(function (tab) {
                var isActive = activeView === tab.key;
                var isHovered = hoveredTab === tab.key;
                return (React.createElement("button", { key: tab.key, type: "button", onClick: function () { return setActiveView(tab.key); }, onMouseEnter: function () { return setHoveredTab(tab.key); }, onMouseLeave: function () { return setHoveredTab(null); }, style: {
                        backgroundColor: isActive
                            ? theme_1.THEME.colors.primary
                            : isHovered
                                ? theme_1.THEME.colors.primarySoft
                                : 'transparent',
                        color: isActive ? '#ffffff' : theme_1.THEME.colors.textPrimary,
                        border: isActive
                            ? "1px solid ".concat(theme_1.THEME.colors.primary)
                            : '1px solid transparent',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        cursor: 'pointer',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '14px',
                        transition: 'background-color 160ms ease, color 160ms ease',
                    } }, tab.label));
            })),
            React.createElement("div", { style: {
                    transition: 'opacity 180ms ease, transform 180ms ease',
                    opacity: isViewVisible ? 1 : 0,
                    transform: isViewVisible ? 'translateY(0)' : 'translateY(4px)',
                } }, renderTaskWorkspaceView(displayedView))))); };
    var renderDashboardView = function () {
        var openTaskCount = taskItems.filter(function (item) { return item.status !== 'Completed'; }).length;
        var openIncidentCount = incidentItems.filter(function (item) { return item.status !== 'Resolved'; }).length;
        var criticalIncidentCount = incidentItems.filter(function (item) { return item.severity === 'P1'; }).length;
        var assignedCount = taskItems.filter(function (item) { return Boolean(item.assignedTo); }).length;
        if (isLoading)
            return renderLoadingState('Loading dashboard...');
        return (React.createElement("div", { style: { display: 'grid', gap: '16px' } },
            renderWorkspaceHeader('Dashboard', 'Portfolio snapshot across active tasks and operational incidents.'),
            React.createElement("div", { style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                } }, [
                { label: 'Open Tasks', value: openTaskCount.toString() },
                { label: 'Assigned Tasks', value: assignedCount.toString() },
                { label: 'Open Incidents', value: openIncidentCount.toString() },
                { label: 'P1 Incidents', value: criticalIncidentCount.toString() },
            ].map(function (card) { return (React.createElement("div", { key: card.label, style: {
                    backgroundColor: theme_1.THEME.colors.panel,
                    border: "1px solid ".concat(theme_1.THEME.colors.border),
                    borderRadius: '16px',
                    padding: '18px 20px',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
                } },
                React.createElement("div", { style: {
                        fontSize: '12px',
                        color: theme_1.THEME.colors.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                    } }, card.label),
                React.createElement("div", { style: {
                        marginTop: '10px',
                        fontSize: '30px',
                        fontWeight: 700,
                        color: theme_1.THEME.colors.textStrong,
                    } }, card.value))); })),
            React.createElement("div", { style: {
                    backgroundColor: theme_1.THEME.colors.panel,
                    border: "1px solid ".concat(theme_1.THEME.colors.border),
                    borderRadius: '16px',
                    overflow: 'hidden',
                } },
                React.createElement(ChartView_1.default, { tasks: taskItems, statuses: TASK_STATUSES }))));
    };
    var renderIncidentsView = function () {
        if (isLoading)
            return renderLoadingState('Loading incidents...');
        return (React.createElement("div", { style: { display: 'grid', gap: '16px' } },
            renderWorkspaceHeader('Incidents', 'Track operational disruptions with severity, ownership, and impact context.'),
            React.createElement("div", { style: {
                    backgroundColor: theme_1.THEME.colors.panel,
                    border: "1px solid ".concat(theme_1.THEME.colors.border),
                    borderRadius: '16px',
                    overflow: 'hidden',
                } },
                React.createElement(BoardView_1.default, { tasks: incidentItems, statuses: INCIDENT_STATUSES, type: "incident", onTaskClick: handleTaskClick, onNewTask: handleNewTask, onTaskStatusChange: handleTaskStatusChange }))));
    };
    var renderReportsView = function () { return (React.createElement("div", { style: { display: 'grid', gap: '16px' } },
        renderWorkspaceHeader('Reports', 'Embedded Power BI reports for operational analytics and performance tracking.'),
        React.createElement(ReportsView_1.default, { reports: POWER_BI_REPORTS }))); };
    var renderSelectedView = function () {
        switch (selectedView) {
            case 'dashboard': return renderDashboardView();
            case 'incidents': return renderIncidentsView();
            case 'reports': return renderReportsView();
            case 'tasks':
            default: return renderTasksView();
        }
    };
    return (React.createElement(AppLayout_1.default, { selectedView: selectedView, onSelectView: setSelectedView },
        renderSelectedView(),
        React.createElement(WorkItemModal_1.default, { task: modalTask, canAssign: canAssign, siteUrl: pnpjsConfig_1.DATA_SITE, context: context, currentUserName: currentUserName, currentUserSpId: currentUserSpId, onSave: handleSaveTask, onDelete: handleDeleteTask, onClose: handleCloseModal })));
};
exports.default = TaskBoard;
//# sourceMappingURL=TaskBoard.js.map