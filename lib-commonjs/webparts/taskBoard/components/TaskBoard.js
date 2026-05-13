"use strict";
// TaskBoard.tsx
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
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
var IncidentVisibilityService_1 = require("../../../services/incidents/IncidentVisibilityService");
var IncidentAssignmentService_1 = require("../../../services/incidents/IncidentAssignmentService");
var IncidentPolicy_1 = require("../../../services/incidents/IncidentPolicy");
var IncidentDepartmentRules_1 = require("../../../services/incidents/IncidentDepartmentRules");
var TEMP_ID_PREFIX = 'temp_';
var TASK_STATUSES = ['Unassigned', 'Backlog', 'ThisWeek', 'InProgress', 'Completed'];
var INCIDENT_STATUSES = ['New', 'Investigating', 'Escalated', 'Resolved'];
var INCIDENT_DEPARTMENT_TABS = ['Support', 'IT', 'Accounts', 'Operations', 'Complaints'];
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
var toRequestType = function (type) { return type === 'incident' ? 'Incident' : 'Task'; };
var toWorkItemType = function (requestType) { return (requestType !== null && requestType !== void 0 ? requestType : '').toLowerCase() === 'incident' ? 'incident' : 'task'; };
var toTaskPriority = function (value) {
    if (value === 'Critical' || value === 'High' || value === 'Medium' || value === 'Low')
        return value;
    return 'Medium';
};
var toTaskSite = function (value) { return value === 'Troyville' ? 'Troyville' : 'Albertsdal'; };
var toTaskStatus = function (value) {
    return value && TASK_STATUSES.indexOf(value) > -1 ? value : 'Unassigned';
};
var toIncidentStatus = function (value) {
    return value && INCIDENT_STATUSES.indexOf(value) > -1 ? value : 'New';
};
var toWorkItemStatus = function (value, type) {
    return type === 'incident' ? toIncidentStatus(value) : toTaskStatus(value);
};
var getStatusesForType = function (type) {
    return type === 'incident' ? INCIDENT_STATUSES : TASK_STATUSES;
};
var getTodayIso = function () {
    var d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
};
var resolveUserNameFromId = function (userId) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var sp, user, _a, userInfo, _b;
    var _c, _d, _e;
    return tslib_1.__generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                sp = (0, pnpjsConfig_1.getSP)();
                _f.label = 1;
            case 1:
                _f.trys.push([1, 3, , 8]);
                return [4 /*yield*/, sp.web.siteUsers.getById(userId)()];
            case 2:
                user = _f.sent();
                return [2 /*return*/, (_c = user === null || user === void 0 ? void 0 : user.Title) !== null && _c !== void 0 ? _c : null];
            case 3:
                _a = _f.sent();
                _f.label = 4;
            case 4:
                _f.trys.push([4, 6, , 7]);
                return [4 /*yield*/, sp.web.siteUserInfoList.items.filter("Id eq ".concat(userId)).select('Id', 'Title').top(1)()];
            case 5:
                userInfo = _f.sent();
                return [2 /*return*/, (_e = (_d = userInfo === null || userInfo === void 0 ? void 0 : userInfo[0]) === null || _d === void 0 ? void 0 : _d.Title) !== null && _e !== void 0 ? _e : null];
            case 6:
                _b = _f.sent();
                return [2 /*return*/, null];
            case 7: return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); };
var resolveSharePointUserId = function (email, loginName) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var sp, result, _a, result, _b, safeEmail, userInfo, _c;
    var _d;
    return tslib_1.__generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                sp = (0, pnpjsConfig_1.getSP)();
                if (!email) return [3 /*break*/, 4];
                _e.label = 1;
            case 1:
                _e.trys.push([1, 3, , 4]);
                return [4 /*yield*/, sp.web.ensureUser(email)];
            case 2:
                result = _e.sent();
                if (result === null || result === void 0 ? void 0 : result.Id)
                    return [2 /*return*/, result.Id];
                return [3 /*break*/, 4];
            case 3:
                _a = _e.sent();
                return [3 /*break*/, 4];
            case 4:
                if (!loginName) return [3 /*break*/, 8];
                _e.label = 5;
            case 5:
                _e.trys.push([5, 7, , 8]);
                return [4 /*yield*/, sp.web.ensureUser(loginName)];
            case 6:
                result = _e.sent();
                if (result === null || result === void 0 ? void 0 : result.Id)
                    return [2 /*return*/, result.Id];
                return [3 /*break*/, 8];
            case 7:
                _b = _e.sent();
                return [3 /*break*/, 8];
            case 8:
                if (!email) return [3 /*break*/, 12];
                _e.label = 9;
            case 9:
                _e.trys.push([9, 11, , 12]);
                safeEmail = email.replace(/'/g, "''");
                return [4 /*yield*/, sp.web.siteUserInfoList.items.filter("UserName eq '".concat(safeEmail, "'")).select('Id').top(1)()];
            case 10:
                userInfo = _e.sent();
                if ((_d = userInfo === null || userInfo === void 0 ? void 0 : userInfo[0]) === null || _d === void 0 ? void 0 : _d.Id)
                    return [2 /*return*/, userInfo[0].Id];
                return [3 /*break*/, 12];
            case 11:
                _c = _e.sent();
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
var TaskBoard = function (_a) {
    var context = _a.context;
    var _b = (0, react_1.useState)([]), workItems = _b[0], setWorkItems = _b[1];
    var _c = (0, react_1.useState)(null), modalTask = _c[0], setModalTask = _c[1];
    var _d = (0, react_1.useState)('dashboard'), selectedView = _d[0], setSelectedView = _d[1];
    var _e = (0, react_1.useState)('board'), activeView = _e[0], setActiveView = _e[1];
    var _f = (0, react_1.useState)('board'), displayedView = _f[0], setDisplayedView = _f[1];
    var _g = (0, react_1.useState)(true), isViewVisible = _g[0], setIsViewVisible = _g[1];
    var _h = (0, react_1.useState)(null), hoveredTab = _h[0], setHoveredTab = _h[1];
    var _j = (0, react_1.useState)('Support'), selectedIncidentDepartment = _j[0], setSelectedIncidentDepartment = _j[1];
    var _k = (0, react_1.useState)(null), hoveredIncidentDepartment = _k[0], setHoveredIncidentDepartment = _k[1];
    var _l = (0, react_1.useState)(false), canAssign = _l[0], setCanAssign = _l[1];
    var _m = (0, react_1.useState)(''), currentUserName = _m[0], setCurrentUserName = _m[1];
    var _o = (0, react_1.useState)(''), currentUserEmail = _o[0], setCurrentUserEmail = _o[1];
    var _p = (0, react_1.useState)(null), currentUserSpId = _p[0], setCurrentUserSpId = _p[1];
    var _q = (0, react_1.useState)(true), isLoading = _q[0], setIsLoading = _q[1];
    var _r = (0, react_1.useState)(''), currentUserRole = _r[0], setCurrentUserRole = _r[1];
    var _s = (0, react_1.useState)('Support'), currentUserDepartment = _s[0], setCurrentUserDepartment = _s[1];
    var _t = (0, react_1.useState)(false), canAssignAcrossDepartments = _t[0], setCanAssignAcrossDepartments = _t[1];
    var _u = (0, react_1.useState)(false), isDepartmentLead = _u[0], setIsDepartmentLead = _u[1];
    var taskService = (0, react_1.useMemo)(function () { return new TaskService_1.TaskService(); }, []);
    var incidentUserContext = (0, react_1.useMemo)(function () { return ({
        id: currentUserSpId,
        role: currentUserRole,
        department: currentUserDepartment,
        canAssign: canAssign,
        canAssignAcrossDepartments: canAssignAcrossDepartments,
        isDepartmentLead: isDepartmentLead,
    }); }, [currentUserSpId, currentUserRole, currentUserDepartment, canAssign, canAssignAcrossDepartments, isDepartmentLead]);
    var taskItems = (0, react_1.useMemo)(function () { return workItems.filter(function (item) { return item.type === 'task'; }); }, [workItems]);
    var allIncidentItems = (0, react_1.useMemo)(function () { return workItems.filter(function (item) { return item.type === 'incident'; }); }, [workItems]);
    var visibleIncidentItems = (0, react_1.useMemo)(function () { return IncidentVisibilityService_1.IncidentVisibilityService.filterVisibleIncidents(incidentUserContext, allIncidentItems); }, [incidentUserContext, allIncidentItems]);
    var incidentItems = (0, react_1.useMemo)(function () { return visibleIncidentItems.filter(function (item) { return (0, IncidentDepartmentRules_1.normalizeDepartment)(item.department) === selectedIncidentDepartment; }); }, [visibleIncidentItems, selectedIncidentDepartment]);
    (0, react_1.useEffect)(function () {
        window.spfxContext = context;
        (0, pnpjsConfig_1.initSP)(context);
    }, [context]);
    var mapServiceItemToTask = React.useCallback(function (item, createdByFallback) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var type, priority, assignedToName, resolvedName;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        return tslib_1.__generator(this, function (_l) {
            switch (_l.label) {
                case 0:
                    type = (_a = item.type) !== null && _a !== void 0 ? _a : toWorkItemType(item.requestType);
                    priority = type === 'incident' && item.severity ? (0, incidentSla_1.getPriorityFromSeverity)(item.severity) : toTaskPriority(item.priority);
                    assignedToName = '';
                    if (item.assignedTo) {
                        assignedToName = typeof item.assignedTo === 'object'
                            ? (_c = (_b = item.assignedTo.Title) !== null && _b !== void 0 ? _b : item.assignedTo.Name) !== null && _c !== void 0 ? _c : ''
                            : String(item.assignedTo);
                    }
                    if (!(!assignedToName && item.assignedToId)) return [3 /*break*/, 2];
                    return [4 /*yield*/, resolveUserNameFromId(item.assignedToId)];
                case 1:
                    resolvedName = _l.sent();
                    if (resolvedName)
                        assignedToName = resolvedName;
                    _l.label = 2;
                case 2:
                    if (!assignedToName && item.assignedToEmail) {
                        assignedToName = (_d = item.assignedToEmail.split('@')[0]) !== null && _d !== void 0 ? _d : item.assignedToEmail;
                    }
                    return [2 /*return*/, {
                            id: item.id.toString(),
                            type: type,
                            title: item.title,
                            status: toWorkItemStatus(item.status, type),
                            priority: priority,
                            site: toTaskSite(item.site),
                            assignedTo: assignedToName,
                            assignedToUser: assignedToName ? { id: (_e = item.assignedToId) !== null && _e !== void 0 ? _e : null, name: assignedToName, email: (_f = item.assignedToEmail) !== null && _f !== void 0 ? _f : '' } : undefined,
                            assignedToId: (_g = item.assignedToId) !== null && _g !== void 0 ? _g : undefined,
                            assignedToEmail: item.assignedToEmail,
                            assignedToLoginName: item.assignedToLoginName,
                            startDate: item.startDate,
                            dueDate: item.dueDate,
                            createdAt: (_h = item.createdAt) !== null && _h !== void 0 ? _h : new Date().toISOString(),
                            requestType: toRequestType(type),
                            department: (0, IncidentDepartmentRules_1.normalizeDepartment)(item.department),
                            description: item.description,
                            createdBy: (_j = item.createdBy) !== null && _j !== void 0 ? _j : createdByFallback,
                            authorId: (_k = item.authorId) !== null && _k !== void 0 ? _k : null,
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
    var filterVisibleWorkItems = function (allTasks, userId, userContext) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var collaborationTaskIds, tasks, incidents;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchCollaborationTaskIds(userId)];
                case 1:
                    collaborationTaskIds = _a.sent();
                    tasks = allTasks.filter(function (task) {
                        if (task.type === 'incident')
                            return false;
                        return task.authorId === userId || task.assignedToId === userId || collaborationTaskIds.has(task.id);
                    });
                    incidents = IncidentVisibilityService_1.IncidentVisibilityService.filterVisibleIncidents(userContext, allTasks.filter(function (item) { return item.type === 'incident'; }));
                    return [2 /*return*/, tslib_1.__spreadArray(tslib_1.__spreadArray([], tasks, true), incidents, true)];
            }
        });
    }); };
    var loadAndMapTasks = function (userContextOverride) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var sp, user_1, userId, items, mappedTasks, visibleTasks, error_1;
        var _a, _b;
        return tslib_1.__generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 7, , 8]);
                    sp = (0, pnpjsConfig_1.getSP)();
                    return [4 /*yield*/, sp.web.currentUser()];
                case 1:
                    user_1 = _c.sent();
                    userId = user_1.Id;
                    setCurrentUserName((_a = user_1.Title) !== null && _a !== void 0 ? _a : '');
                    setCurrentUserEmail((_b = user_1.Email) !== null && _b !== void 0 ? _b : '');
                    setCurrentUserSpId(userId !== null && userId !== void 0 ? userId : null);
                    return [4 /*yield*/, taskService.getTasks()];
                case 2:
                    items = _c.sent();
                    return [4 /*yield*/, Promise.all(items.map(function (item) { var _a; return mapServiceItemToTask(item, (_a = user_1.Title) !== null && _a !== void 0 ? _a : ''); }))];
                case 3:
                    mappedTasks = _c.sent();
                    if (!userId) return [3 /*break*/, 5];
                    return [4 /*yield*/, filterVisibleWorkItems(mappedTasks, userId, userContextOverride !== null && userContextOverride !== void 0 ? userContextOverride : incidentUserContext)];
                case 4:
                    visibleTasks = _c.sent();
                    setWorkItems(visibleTasks);
                    return [3 /*break*/, 6];
                case 5:
                    setWorkItems(mappedTasks);
                    _c.label = 6;
                case 6: return [3 /*break*/, 8];
                case 7:
                    error_1 = _c.sent();
                    console.error('TaskBoard: load failed', error_1);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    }); };
    (0, react_1.useEffect)(function () {
        var initialize = function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
            var sp, user, userId, userEmail, role, normalizedRoleDepartment, resolvedCanAssign, resolvedCanAssignAcrossDepartments, resolvedIsDepartmentLead, roleError_1, fallbackDepartment, notificationService, error_2;
            var _a, _b, _c, _d, _e;
            return tslib_1.__generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _f.trys.push([0, 9, 10, 11]);
                        setIsLoading(true);
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, sp.web.currentUser()];
                    case 1:
                        user = _f.sent();
                        userId = (_a = user.Id) !== null && _a !== void 0 ? _a : null;
                        userEmail = (_b = user.Email) !== null && _b !== void 0 ? _b : '';
                        setCurrentUserName((_c = user.Title) !== null && _c !== void 0 ? _c : '');
                        setCurrentUserEmail(userEmail);
                        setCurrentUserSpId(userId);
                        _f.label = 2;
                    case 2:
                        _f.trys.push([2, 5, , 7]);
                        return [4 /*yield*/, (0, UserRoleService_1.getUserRole)(userEmail)];
                    case 3:
                        role = _f.sent();
                        normalizedRoleDepartment = (0, IncidentDepartmentRules_1.normalizeDepartment)(role === null || role === void 0 ? void 0 : role.department);
                        resolvedCanAssign = (role === null || role === void 0 ? void 0 : role.canAssign) === true;
                        resolvedCanAssignAcrossDepartments = (role === null || role === void 0 ? void 0 : role.canAssignAcrossDepartments) === true;
                        resolvedIsDepartmentLead = (role === null || role === void 0 ? void 0 : role.isDepartmentLead) === true;
                        setCanAssign(resolvedCanAssign);
                        setCurrentUserRole((_d = role === null || role === void 0 ? void 0 : role.role) !== null && _d !== void 0 ? _d : '');
                        setCurrentUserDepartment(normalizedRoleDepartment);
                        setCanAssignAcrossDepartments(resolvedCanAssignAcrossDepartments);
                        setIsDepartmentLead(resolvedIsDepartmentLead);
                        return [4 /*yield*/, loadAndMapTasks({
                                id: userId,
                                role: (_e = role === null || role === void 0 ? void 0 : role.role) !== null && _e !== void 0 ? _e : '',
                                department: normalizedRoleDepartment,
                                canAssign: resolvedCanAssign,
                                canAssignAcrossDepartments: resolvedCanAssignAcrossDepartments,
                                isDepartmentLead: resolvedIsDepartmentLead,
                            })];
                    case 4:
                        _f.sent();
                        return [3 /*break*/, 7];
                    case 5:
                        roleError_1 = _f.sent();
                        console.warn('TaskBoard: role lookup failed; defaulting to read-only assignment', roleError_1);
                        fallbackDepartment = (0, IncidentDepartmentRules_1.normalizeDepartment)('Support');
                        setCanAssign(false);
                        setCurrentUserRole('');
                        setCurrentUserDepartment(fallbackDepartment);
                        setCanAssignAcrossDepartments(false);
                        setIsDepartmentLead(false);
                        return [4 /*yield*/, loadAndMapTasks({
                                id: userId,
                                role: '',
                                department: fallbackDepartment,
                                canAssign: false,
                                canAssignAcrossDepartments: false,
                                isDepartmentLead: false,
                            })];
                    case 6:
                        _f.sent();
                        return [3 /*break*/, 7];
                    case 7:
                        notificationService = new NotificationService_1.NotificationService(context);
                        taskService.setNotificationService(notificationService);
                        return [4 /*yield*/, taskService.checkAndEscalateSLAs()];
                    case 8:
                        _f.sent();
                        return [3 /*break*/, 11];
                    case 9:
                        error_2 = _f.sent();
                        console.error('TaskBoard: initial load failed', error_2);
                        return [3 /*break*/, 11];
                    case 10:
                        setIsLoading(false);
                        return [7 /*endfinally*/];
                    case 11: return [2 /*return*/];
                }
            });
        }); };
        void initialize();
    }, [context, taskService, mapServiceItemToTask]);
    (0, react_1.useEffect)(function () {
        if (isLoading || !currentUserSpId)
            return;
        var interval = window.setInterval(function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
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
                        return [4 /*yield*/, filterVisibleWorkItems(mapped, currentUserSpId, incidentUserContext)];
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
        return function () { return window.clearInterval(interval); };
    }, [isLoading, currentUserSpId, currentUserName, taskService, mapServiceItemToTask, incidentUserContext]);
    (0, react_1.useEffect)(function () {
        if (activeView === displayedView)
            return;
        setIsViewVisible(false);
        var timer = window.setTimeout(function () {
            setDisplayedView(activeView);
            setIsViewVisible(true);
        }, 120);
        return function () { return window.clearTimeout(timer); };
    }, [activeView, displayedView]);
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
                    setWorkItems(function (current) { return current.map(function (task) { return task.id === taskId ? tslib_1.__assign(tslib_1.__assign({}, task), { status: newStatus }) : task; }); });
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
                    setWorkItems(function (current) { return current.map(function (task) { return task.id === taskId ? tslib_1.__assign(tslib_1.__assign({}, task), { status: draggedItem.status }) : task; }); });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleTaskClick = function (task) {
        setModalTask(task);
    };
    var handleNewTask = function (status, type) {
        var today = getTodayIso();
        var defaultDepartment = type === 'incident' ? selectedIncidentDepartment : (0, IncidentDepartmentRules_1.normalizeDepartment)('IT');
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
            department: defaultDepartment,
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
    var handleCloseModal = function () { return setModalTask(null); };
    var handleSaveTask = function (task) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var isNew, existingTask, effectiveTask_1, finalAssigneeId, finalAssigneeName, resolved, incidentType, incidentTypeId, derivedSeverity, derivedPriority, derivedDepartment, incidentInput, canAssignIncident, normaliseDate, shouldRebuildIncidentSla, incidentSla, payload, created, returnedId, items, mapped, visibleTasks, _a, persisted_1, updated_1, error_5;
        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
        return tslib_1.__generator(this, function (_x) {
            switch (_x.label) {
                case 0:
                    _x.trys.push([0, 12, , 13]);
                    isNew = task.id.startsWith(TEMP_ID_PREFIX);
                    existingTask = isNew ? null : (_b = workItems.find(function (item) { return item.id === task.id; })) !== null && _b !== void 0 ? _b : null;
                    effectiveTask_1 = !canAssign && task.type !== 'incident'
                        ? tslib_1.__assign(tslib_1.__assign({}, task), { assignedTo: currentUserName, assignedToEmail: currentUserEmail, assignedToId: undefined, assignedToLoginName: undefined }) : task;
                    finalAssigneeId = (_c = effectiveTask_1.assignedToId) !== null && _c !== void 0 ? _c : null;
                    finalAssigneeName = (_d = effectiveTask_1.assignedTo) !== null && _d !== void 0 ? _d : '';
                    if (!((!finalAssigneeId || finalAssigneeId <= 0) && (effectiveTask_1.assignedToEmail || effectiveTask_1.assignedToLoginName))) return [3 /*break*/, 2];
                    return [4 /*yield*/, resolveSharePointUserId((_e = effectiveTask_1.assignedToEmail) !== null && _e !== void 0 ? _e : '', (_f = effectiveTask_1.assignedToLoginName) !== null && _f !== void 0 ? _f : '')];
                case 1:
                    resolved = _x.sent();
                    if (resolved)
                        finalAssigneeId = resolved;
                    _x.label = 2;
                case 2:
                    if (!finalAssigneeId || finalAssigneeId <= 0) {
                        if (effectiveTask_1.assignedToEmail || effectiveTask_1.assignedToLoginName || effectiveTask_1.assignedTo) {
                            throw new Error('Could not resolve selected user to a SharePoint account. Select a valid user and try again.');
                        }
                        finalAssigneeId = null;
                        finalAssigneeName = '';
                    }
                    incidentType = effectiveTask_1.type === 'incident' ? (_g = effectiveTask_1.incidentType) !== null && _g !== void 0 ? _g : null : null;
                    incidentTypeId = effectiveTask_1.type === 'incident' ? (_j = (_h = incidentType === null || incidentType === void 0 ? void 0 : incidentType.id) !== null && _h !== void 0 ? _h : effectiveTask_1.incidentTypeId) !== null && _j !== void 0 ? _j : null : null;
                    derivedSeverity = effectiveTask_1.type === 'incident' ? (_k = incidentType === null || incidentType === void 0 ? void 0 : incidentType.severity) !== null && _k !== void 0 ? _k : effectiveTask_1.severity : undefined;
                    derivedPriority = effectiveTask_1.type === 'incident' ? (0, incidentSla_1.getPriorityFromSeverity)(derivedSeverity) : effectiveTask_1.priority;
                    derivedDepartment = effectiveTask_1.type === 'incident'
                        ? (0, IncidentDepartmentRules_1.normalizeDepartment)((_l = incidentType === null || incidentType === void 0 ? void 0 : incidentType.department) !== null && _l !== void 0 ? _l : effectiveTask_1.department)
                        : (0, IncidentDepartmentRules_1.normalizeDepartment)(effectiveTask_1.department);
                    if (effectiveTask_1.type === 'incident' && (!incidentTypeId || !derivedSeverity)) {
                        throw new Error('Incident Type is required before an incident can be created.');
                    }
                    if (effectiveTask_1.type === 'incident') {
                        incidentInput = {
                            department: derivedDepartment,
                            severity: derivedSeverity,
                            assignedToId: finalAssigneeId,
                            site: effectiveTask_1.site,
                            incidentTypeTitle: incidentType === null || incidentType === void 0 ? void 0 : incidentType.title,
                        };
                        if (isNew && !IncidentPolicy_1.IncidentPolicy.canCreateIncident(incidentUserContext, derivedDepartment)) {
                            throw new Error('You are not allowed to create incidents for this department.');
                        }
                        if (!isNew && !IncidentPolicy_1.IncidentPolicy.canEditIncident(incidentUserContext, incidentInput)) {
                            throw new Error('You are not allowed to edit this incident.');
                        }
                        if (IncidentPolicy_1.IncidentPolicy.requiresSite(incidentInput) && !effectiveTask_1.site) {
                            throw new Error('IT incidents require a site.');
                        }
                        if (finalAssigneeId !== null && finalAssigneeId !== undefined) {
                            canAssignIncident = finalAssigneeId === currentUserSpId
                                ? IncidentAssignmentService_1.IncidentAssignmentService.canClaimIncident(incidentUserContext, {
                                    department: derivedDepartment,
                                    severity: derivedSeverity,
                                    assignedToId: finalAssigneeId,
                                    incidentType: incidentType,
                                    site: effectiveTask_1.site,
                                })
                                : IncidentAssignmentService_1.IncidentAssignmentService.canAssignIncident(incidentUserContext, {
                                    department: derivedDepartment,
                                    severity: derivedSeverity,
                                    assignedToId: finalAssigneeId,
                                    incidentType: incidentType,
                                    site: effectiveTask_1.site,
                                }, {
                                    id: finalAssigneeId,
                                    department: derivedDepartment,
                                });
                            if (!canAssignIncident)
                                throw new Error('You are not allowed to assign this incident.');
                        }
                    }
                    normaliseDate = function (value) {
                        if (!value)
                            return '';
                        if (/^\d{4}-\d{2}-\d{2}$/.test(value))
                            return value;
                        var parsed = new Date(value);
                        return isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
                    };
                    shouldRebuildIncidentSla = effectiveTask_1.type === 'incident' && Boolean(derivedSeverity) && (isNew ||
                        (existingTask === null || existingTask === void 0 ? void 0 : existingTask.incidentTypeId) !== incidentTypeId ||
                        !(existingTask === null || existingTask === void 0 ? void 0 : existingTask.responseDueDate) ||
                        !(existingTask === null || existingTask === void 0 ? void 0 : existingTask.resolutionDueDate));
                    incidentSla = shouldRebuildIncidentSla && derivedSeverity ? (0, incidentSla_1.buildIncidentSla)(derivedSeverity) : null;
                    payload = {
                        title: effectiveTask_1.title,
                        status: effectiveTask_1.status,
                        priority: derivedPriority,
                        site: (_m = effectiveTask_1.site) !== null && _m !== void 0 ? _m : 'Albertsdal',
                        assignedToId: finalAssigneeId,
                        startDate: normaliseDate(effectiveTask_1.startDate) || getTodayIso(),
                        dueDate: normaliseDate(effectiveTask_1.dueDate),
                        description: (_o = effectiveTask_1.description) !== null && _o !== void 0 ? _o : '',
                        requestType: toRequestType(effectiveTask_1.type),
                        department: derivedDepartment,
                        severity: effectiveTask_1.type === 'incident' ? derivedSeverity : undefined,
                        impact: effectiveTask_1.type === 'incident' ? (_p = effectiveTask_1.impact) !== null && _p !== void 0 ? _p : '' : undefined,
                        affectedService: effectiveTask_1.type === 'incident' ? (_q = effectiveTask_1.affectedService) !== null && _q !== void 0 ? _q : '' : undefined,
                        incidentTypeId: effectiveTask_1.type === 'incident' ? incidentTypeId : null,
                        incidentType: effectiveTask_1.type === 'incident' ? incidentType : null,
                        slaResponseMinutes: (_r = incidentSla === null || incidentSla === void 0 ? void 0 : incidentSla.responseMinutes) !== null && _r !== void 0 ? _r : effectiveTask_1.slaResponseMinutes,
                        slaResolutionMinutes: (_s = incidentSla === null || incidentSla === void 0 ? void 0 : incidentSla.resolutionMinutes) !== null && _s !== void 0 ? _s : effectiveTask_1.slaResolutionMinutes,
                        responseDueDate: (_t = incidentSla === null || incidentSla === void 0 ? void 0 : incidentSla.responseDueDate) !== null && _t !== void 0 ? _t : effectiveTask_1.responseDueDate,
                        resolutionDueDate: (_u = incidentSla === null || incidentSla === void 0 ? void 0 : incidentSla.resolutionDueDate) !== null && _u !== void 0 ? _u : effectiveTask_1.resolutionDueDate,
                        slaDeadline: (_v = incidentSla === null || incidentSla === void 0 ? void 0 : incidentSla.deadline) !== null && _v !== void 0 ? _v : effectiveTask_1.slaDeadline,
                        slaStatus: (_w = incidentSla === null || incidentSla === void 0 ? void 0 : incidentSla.status) !== null && _w !== void 0 ? _w : effectiveTask_1.slaStatus,
                    };
                    if (!isNew) return [3 /*break*/, 10];
                    return [4 /*yield*/, taskService.createTask(payload)];
                case 3:
                    created = _x.sent();
                    returnedId = (created === null || created === void 0 ? void 0 : created.id) != null ? created.id.toString() : undefined;
                    if (!!returnedId) return [3 /*break*/, 9];
                    return [4 /*yield*/, taskService.getTasks()];
                case 4:
                    items = _x.sent();
                    return [4 /*yield*/, Promise.all(items.map(function (item) { return mapServiceItemToTask(item, currentUserName); }))];
                case 5:
                    mapped = _x.sent();
                    if (!(currentUserSpId != null)) return [3 /*break*/, 7];
                    return [4 /*yield*/, filterVisibleWorkItems(mapped, currentUserSpId, incidentUserContext)];
                case 6:
                    _a = _x.sent();
                    return [3 /*break*/, 8];
                case 7:
                    _a = mapped;
                    _x.label = 8;
                case 8:
                    visibleTasks = _a;
                    setWorkItems(visibleTasks);
                    return [2 /*return*/, tslib_1.__assign(tslib_1.__assign({}, effectiveTask_1), { id: "recovered_".concat(Date.now()) })];
                case 9:
                    persisted_1 = tslib_1.__assign(tslib_1.__assign({}, effectiveTask_1), { id: returnedId, priority: derivedPriority, assignedTo: finalAssigneeName, assignedToId: finalAssigneeId !== null && finalAssigneeId !== void 0 ? finalAssigneeId : undefined, startDate: payload.startDate, dueDate: payload.dueDate, requestType: toRequestType(effectiveTask_1.type), createdBy: currentUserName, department: derivedDepartment, severity: derivedSeverity, incidentTypeId: incidentTypeId, incidentType: incidentType, slaResponseMinutes: payload.slaResponseMinutes, slaResolutionMinutes: payload.slaResolutionMinutes, responseDueDate: payload.responseDueDate, resolutionDueDate: payload.resolutionDueDate, slaDeadline: payload.slaDeadline, slaStatus: payload.slaStatus });
                    setWorkItems(function (prev) { return tslib_1.__spreadArray(tslib_1.__spreadArray([], prev, true), [persisted_1], false); });
                    return [2 /*return*/, persisted_1];
                case 10: return [4 /*yield*/, taskService.updateTask(Number(effectiveTask_1.id), payload)];
                case 11:
                    _x.sent();
                    updated_1 = tslib_1.__assign(tslib_1.__assign({}, effectiveTask_1), { priority: derivedPriority, assignedTo: finalAssigneeName, assignedToId: finalAssigneeId !== null && finalAssigneeId !== void 0 ? finalAssigneeId : undefined, startDate: payload.startDate, dueDate: payload.dueDate, requestType: toRequestType(effectiveTask_1.type), department: derivedDepartment, severity: derivedSeverity, incidentTypeId: incidentTypeId, incidentType: incidentType, slaResponseMinutes: payload.slaResponseMinutes, slaResolutionMinutes: payload.slaResolutionMinutes, responseDueDate: payload.responseDueDate, resolutionDueDate: payload.resolutionDueDate, slaDeadline: payload.slaDeadline, slaStatus: payload.slaStatus });
                    setWorkItems(function (prev) { return prev.map(function (item) { return item.id === effectiveTask_1.id ? updated_1 : item; }); });
                    return [2 /*return*/, updated_1];
                case 12:
                    error_5 = _x.sent();
                    console.error('TaskBoard: saveTask failed', error_5);
                    if (error_5 instanceof Error)
                        throw error_5;
                    throw new Error('Could not save work item to SharePoint.');
                case 13: return [2 /*return*/];
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
        var _a, _b;
        var nextUpdates = updates;
        if (updates.assignedTo !== undefined || updates.assignedToId !== undefined) {
            var existingItem = workItems.find(function (item) { return item.id === id; });
            if ((existingItem === null || existingItem === void 0 ? void 0 : existingItem.type) === 'incident') {
                var targetId = (_b = (_a = updates.assignedToId) !== null && _a !== void 0 ? _a : existingItem.assignedToId) !== null && _b !== void 0 ? _b : null;
                var canAssignIncident = targetId === currentUserSpId
                    ? IncidentAssignmentService_1.IncidentAssignmentService.canClaimIncident(incidentUserContext, existingItem)
                    : IncidentAssignmentService_1.IncidentAssignmentService.canAssignIncident(incidentUserContext, existingItem, targetId ? { id: targetId, department: existingItem.department } : null);
                if (!canAssignIncident) {
                    var assignedTo = updates.assignedTo, assignedToId = updates.assignedToId, assignedToEmail = updates.assignedToEmail, assignedToLoginName = updates.assignedToLoginName, rest = tslib_1.__rest(updates, ["assignedTo", "assignedToId", "assignedToEmail", "assignedToLoginName"]);
                    nextUpdates = rest;
                }
            }
            else if (!canAssign) {
                var assignedTo = updates.assignedTo, assignedToId = updates.assignedToId, assignedToEmail = updates.assignedToEmail, assignedToLoginName = updates.assignedToLoginName, rest = tslib_1.__rest(updates, ["assignedTo", "assignedToId", "assignedToEmail", "assignedToLoginName"]);
                nextUpdates = rest;
            }
        }
        setWorkItems(function (prev) { return prev.map(function (item) { return item.id === id ? tslib_1.__assign(tslib_1.__assign({}, item), nextUpdates) : item; }); });
    };
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
                return React.createElement(BoardView_1.default, { tasks: taskItems, statuses: TASK_STATUSES, type: "task", onTaskClick: handleTaskClick, onNewTask: handleNewTask, onTaskStatusChange: handleTaskStatusChange });
            case 'table':
                return React.createElement(TableView_1.default, { tasks: taskItems, statuses: TASK_STATUSES, updateTask: handleUpdateTask, deleteTask: handleDeleteTask, canAssign: canAssign });
            case 'calendar':
                return React.createElement(CalendarView_1.default, { tasks: taskItems, onTaskClick: function (id) { var task = taskItems.find(function (item) { return item.id === id; }); if (task)
                        handleTaskClick(task); } });
            case 'gantt':
                return React.createElement(GanttView_1.default, { tasks: taskItems, statuses: TASK_STATUSES, onTaskClick: function (id) { var task = taskItems.find(function (item) { return item.id === id; }); if (task)
                        handleTaskClick(task); } });
            case 'chart':
                return React.createElement(ChartView_1.default, { tasks: taskItems, statuses: TASK_STATUSES });
            default:
                return React.createElement(React.Fragment, null);
        }
    };
    var renderTasksView = function () { return (React.createElement("div", { style: { display: 'grid', gap: '16px' } },
        renderWorkspaceHeader('Tasks', 'Operational planning, delivery tracking, and cross-team execution.'),
        React.createElement("div", { style: { backgroundColor: theme_1.THEME.colors.panel, border: "1px solid ".concat(theme_1.THEME.colors.border), borderRadius: '16px', overflow: 'hidden' } },
            React.createElement("div", { style: { display: 'flex', gap: '4px', padding: '12px 16px 0 16px', backgroundColor: theme_1.THEME.colors.panel, borderBottom: "1px solid ".concat(theme_1.THEME.colors.border) } }, VIEW_TABS.map(function (tab) {
                var isActive = activeView === tab.key;
                var isHovered = hoveredTab === tab.key;
                return (React.createElement("button", { key: tab.key, type: "button", onClick: function () { return setActiveView(tab.key); }, onMouseEnter: function () { return setHoveredTab(tab.key); }, onMouseLeave: function () { return setHoveredTab(null); }, style: {
                        backgroundColor: isActive ? theme_1.THEME.colors.primary : isHovered ? theme_1.THEME.colors.primarySoft : 'transparent',
                        color: isActive ? '#ffffff' : theme_1.THEME.colors.textPrimary,
                        border: isActive ? "1px solid ".concat(theme_1.THEME.colors.primary) : '1px solid transparent',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        cursor: 'pointer',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '14px',
                        transition: 'background-color 160ms ease, color 160ms ease',
                    } }, tab.label));
            })),
            React.createElement("div", { style: { transition: 'opacity 180ms ease', opacity: isViewVisible ? 1 : 0 } }, renderTaskWorkspaceView(displayedView))))); };
    var renderDashboardView = function () {
        var openTaskCount = taskItems.filter(function (item) { return item.status !== 'Completed'; }).length;
        var openIncidentCount = visibleIncidentItems.filter(function (item) { return item.status !== 'Resolved'; }).length;
        var criticalIncidentCount = visibleIncidentItems.filter(function (item) { return item.severity === 'P1'; }).length;
        var assignedCount = taskItems.filter(function (item) { return Boolean(item.assignedTo); }).length;
        if (isLoading)
            return renderLoadingState('Loading dashboard...');
        return (React.createElement("div", { style: { display: 'grid', gap: '16px' } },
            renderWorkspaceHeader('Dashboard', 'Portfolio snapshot across active tasks and operational incidents.'),
            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' } }, [
                { label: 'Open Tasks', value: openTaskCount.toString() },
                { label: 'Assigned Tasks', value: assignedCount.toString() },
                { label: 'Open Incidents', value: openIncidentCount.toString() },
                { label: 'P1 Incidents', value: criticalIncidentCount.toString() },
            ].map(function (card) { return (React.createElement("div", { key: card.label, style: { backgroundColor: theme_1.THEME.colors.panel, border: "1px solid ".concat(theme_1.THEME.colors.border), borderRadius: '16px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)' } },
                React.createElement("div", { style: { fontSize: '12px', color: theme_1.THEME.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em' } }, card.label),
                React.createElement("div", { style: { marginTop: '10px', fontSize: '30px', fontWeight: 700, color: theme_1.THEME.colors.textStrong } }, card.value))); })),
            React.createElement("div", { style: { backgroundColor: theme_1.THEME.colors.panel, border: "1px solid ".concat(theme_1.THEME.colors.border), borderRadius: '16px', overflow: 'hidden' } },
                React.createElement(ChartView_1.default, { tasks: taskItems, statuses: TASK_STATUSES }))));
    };
    var renderIncidentDepartmentTabs = function () { return (React.createElement("div", { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '12px 16px', borderBottom: "1px solid ".concat(theme_1.THEME.colors.border), backgroundColor: theme_1.THEME.colors.panel } }, INCIDENT_DEPARTMENT_TABS.map(function (department) {
        var isActive = selectedIncidentDepartment === department;
        var isHovered = hoveredIncidentDepartment === department;
        var count = visibleIncidentItems.filter(function (item) { return (0, IncidentDepartmentRules_1.normalizeDepartment)(item.department) === department; }).length;
        return (React.createElement("button", { key: department, type: "button", onClick: function () { return setSelectedIncidentDepartment(department); }, onMouseEnter: function () { return setHoveredIncidentDepartment(department); }, onMouseLeave: function () { return setHoveredIncidentDepartment(null); }, style: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: isActive ? theme_1.THEME.colors.primary : isHovered ? theme_1.THEME.colors.primarySoft : 'transparent',
                color: isActive ? '#ffffff' : theme_1.THEME.colors.textPrimary,
                border: isActive ? "1px solid ".concat(theme_1.THEME.colors.primary) : "1px solid ".concat(theme_1.THEME.colors.border),
                borderRadius: '999px',
                padding: '7px 12px',
                cursor: 'pointer',
                fontWeight: isActive ? 700 : 600,
                fontSize: '13px',
                transition: 'background-color 160ms ease, color 160ms ease',
            } },
            React.createElement("span", null, department),
            React.createElement("span", { style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '22px',
                    height: '22px',
                    padding: '0 7px',
                    borderRadius: '999px',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : theme_1.THEME.colors.background,
                    color: isActive ? '#ffffff' : theme_1.THEME.colors.textSecondary,
                    fontSize: '11px',
                    fontWeight: 800,
                } }, count)));
    }))); };
    var renderIncidentsView = function () {
        if (isLoading)
            return renderLoadingState('Loading incidents...');
        return (React.createElement("div", { style: { display: 'grid', gap: '16px' } },
            renderWorkspaceHeader('Incidents', 'Track operational disruptions with severity, ownership, and impact context.'),
            React.createElement("div", { style: { backgroundColor: theme_1.THEME.colors.panel, border: "1px solid ".concat(theme_1.THEME.colors.border), borderRadius: '16px', overflow: 'hidden' } },
                renderIncidentDepartmentTabs(),
                React.createElement(BoardView_1.default, { tasks: incidentItems, statuses: INCIDENT_STATUSES, type: "incident", onTaskClick: handleTaskClick, onNewTask: handleNewTask, onTaskStatusChange: handleTaskStatusChange }))));
    };
    var renderReportsView = function () { return (React.createElement("div", { style: { display: 'grid', gap: '16px' } },
        renderWorkspaceHeader('Reports', 'Embedded Power BI reports for operational analytics and performance tracking.'),
        React.createElement(ReportsView_1.default, { reports: POWER_BI_REPORTS }))); };
    var renderSelectedView = function () {
        switch (selectedView) {
            case 'dashboard':
                return renderDashboardView();
            case 'incidents':
                return renderIncidentsView();
            case 'reports':
                return renderReportsView();
            case 'tasks':
            default:
                return renderTasksView();
        }
    };
    return (React.createElement(AppLayout_1.default, { selectedView: selectedView, onSelectView: setSelectedView },
        renderSelectedView(),
        React.createElement(WorkItemModal_1.default, { task: modalTask, canAssign: canAssign, siteUrl: pnpjsConfig_1.DATA_SITE, context: context, currentUserName: currentUserName, currentUserSpId: currentUserSpId, incidentUserContext: incidentUserContext, onSave: handleSaveTask, onDelete: handleDeleteTask, onClose: handleCloseModal })));
};
exports.default = TaskBoard;
//# sourceMappingURL=TaskBoard.js.map