"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var react_beautiful_dnd_1 = require("react-beautiful-dnd");
var AppLayout_1 = tslib_1.__importDefault(require("./AppLayout"));
var BoardView_1 = tslib_1.__importDefault(require("./BoardView"));
var CalendarView_1 = tslib_1.__importDefault(require("./CalendarView"));
var ChartView_1 = tslib_1.__importDefault(require("./ChartView"));
var GanttView_1 = tslib_1.__importDefault(require("./GanttView"));
var TableView_1 = tslib_1.__importDefault(require("./TableView"));
var incidentSla_1 = require("./incidentSla");
var theme_1 = require("./theme");
var WorkItemModal_1 = tslib_1.__importDefault(require("./WorkItemModal"));
var pnpjsConfig_1 = require("../../../pnpjsConfig");
var TaskService_1 = require("../../../services/TaskService");
var UserRoleService_1 = require("../../../services/UserRoleService");
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
var reorderTasksAfterDrag = function (tasks, result, statuses) {
    var source = result.source, destination = result.destination, draggableId = result.draggableId;
    if (!destination)
        return tasks;
    var srcStatus = source.droppableId;
    var dstStatus = destination.droppableId;
    if (statuses.indexOf(srcStatus) === -1 ||
        statuses.indexOf(dstStatus) === -1 ||
        (srcStatus === dstStatus && source.index === destination.index)) {
        return tasks;
    }
    var draggedTask = tasks.find(function (task) { return task.id === draggableId; });
    if (!draggedTask)
        return tasks;
    var relevantTasks = tasks.filter(function (task) { return task.type === draggedTask.type; });
    var grouped = statuses.reduce(function (acc, status) {
        acc[status] = [];
        return acc;
    }, {});
    relevantTasks.forEach(function (task) {
        if (statuses.indexOf(task.status) > -1) {
            grouped[task.status].push(task);
        }
        else {
            grouped[statuses[0]].push(task);
        }
    });
    var srcTasks = grouped[srcStatus].slice();
    var dstTasks = srcStatus === dstStatus ? srcTasks : grouped[dstStatus].slice();
    var moved = srcTasks.splice(source.index, 1)[0];
    if (!moved)
        return tasks;
    dstTasks.splice(destination.index, 0, tslib_1.__assign(tslib_1.__assign({}, moved), { status: dstStatus }));
    grouped[srcStatus] = srcTasks;
    grouped[dstStatus] = dstTasks;
    var reorderedRelevantTasks = statuses.reduce(function (acc, status) { return acc.concat(grouped[status]); }, []);
    var reorderedIds = new Set(reorderedRelevantTasks.map(function (task) { return task.id; }));
    return tslib_1.__spreadArray(tslib_1.__spreadArray([], tasks.filter(function (task) { return !reorderedIds.has(task.id); }), true), reorderedRelevantTasks, true);
};
var resolveSharePointUserId = function (email, loginName) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var sp, normalizedEmail, normalizedLoginName, tryEnsure, user, _a, claimId, ensuredLoginId, lower, claimId, maybeEmail, user, _b;
    var _c;
    return tslib_1.__generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                sp = (0, pnpjsConfig_1.getSP)();
                normalizedEmail = (email || '').trim();
                normalizedLoginName = (loginName || '').trim();
                tryEnsure = function (value) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
                    var ensured, ensuredAny, _a;
                    var _b, _c, _d;
                    return tslib_1.__generator(this, function (_e) {
                        switch (_e.label) {
                            case 0:
                                if (!value)
                                    return [2 /*return*/, null];
                                _e.label = 1;
                            case 1:
                                _e.trys.push([1, 3, , 4]);
                                return [4 /*yield*/, sp.web.ensureUser(value)];
                            case 2:
                                ensured = _e.sent();
                                ensuredAny = ensured;
                                return [2 /*return*/, (_d = (_b = ensuredAny === null || ensuredAny === void 0 ? void 0 : ensuredAny.Id) !== null && _b !== void 0 ? _b : (_c = ensuredAny === null || ensuredAny === void 0 ? void 0 : ensuredAny.data) === null || _c === void 0 ? void 0 : _c.Id) !== null && _d !== void 0 ? _d : null];
                            case 3:
                                _a = _e.sent();
                                return [2 /*return*/, null];
                            case 4: return [2 /*return*/];
                        }
                    });
                }); };
                if (!normalizedEmail) return [3 /*break*/, 6];
                _d.label = 1;
            case 1:
                _d.trys.push([1, 3, , 4]);
                return [4 /*yield*/, sp.web.siteUsers.getByEmail(normalizedEmail)()];
            case 2:
                user = _d.sent();
                if (user === null || user === void 0 ? void 0 : user.Id)
                    return [2 /*return*/, user.Id];
                return [3 /*break*/, 4];
            case 3:
                _a = _d.sent();
                return [3 /*break*/, 4];
            case 4: return [4 /*yield*/, tryEnsure("i:0#.f|membership|".concat(normalizedEmail))];
            case 5:
                claimId = _d.sent();
                if (claimId)
                    return [2 /*return*/, claimId];
                _d.label = 6;
            case 6:
                if (!normalizedLoginName) return [3 /*break*/, 13];
                return [4 /*yield*/, tryEnsure(normalizedLoginName)];
            case 7:
                ensuredLoginId = _d.sent();
                if (ensuredLoginId)
                    return [2 /*return*/, ensuredLoginId];
                lower = normalizedLoginName.toLowerCase();
                if (!(lower.indexOf('@') > -1 && lower.indexOf('|') === -1)) return [3 /*break*/, 9];
                return [4 /*yield*/, tryEnsure("i:0#.f|membership|".concat(normalizedLoginName))];
            case 8:
                claimId = _d.sent();
                if (claimId)
                    return [2 /*return*/, claimId];
                _d.label = 9;
            case 9:
                maybeEmail = lower.indexOf('|') > -1
                    ? ((_c = normalizedLoginName.split('|').pop()) === null || _c === void 0 ? void 0 : _c.trim()) || ''
                    : '';
                if (!maybeEmail) return [3 /*break*/, 13];
                _d.label = 10;
            case 10:
                _d.trys.push([10, 12, , 13]);
                return [4 /*yield*/, sp.web.siteUsers.getByEmail(maybeEmail)()];
            case 11:
                user = _d.sent();
                if (user === null || user === void 0 ? void 0 : user.Id)
                    return [2 /*return*/, user.Id];
                return [3 /*break*/, 13];
            case 12:
                _b = _d.sent();
                return [3 /*break*/, 13];
            case 13: return [2 /*return*/, null];
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
    var _j = (0, react_1.useState)(false), canAssign = _j[0], setCanAssign = _j[1];
    var _k = (0, react_1.useState)(''), currentUserName = _k[0], setCurrentUserName = _k[1];
    var _l = (0, react_1.useState)(''), currentUserEmail = _l[0], setCurrentUserEmail = _l[1];
    var _m = (0, react_1.useState)(null), currentUserSpId = _m[0], setCurrentUserSpId = _m[1];
    var _o = (0, react_1.useState)(true), isLoading = _o[0], setIsLoading = _o[1];
    var taskService = (0, react_1.useMemo)(function () { return new TaskService_1.TaskService(); }, []);
    var taskItems = (0, react_1.useMemo)(function () { return workItems.filter(function (item) { return item.type === 'task'; }); }, [workItems]);
    var incidentItems = (0, react_1.useMemo)(function () { return workItems.filter(function (item) { return item.type === 'incident'; }); }, [workItems]);
    (0, react_1.useEffect)(function () {
        window.spfxContext = context;
    }, [context]);
    var mapServiceItemToTask = React.useCallback(function (item, createdByFallback) {
        var _a;
        var type = item.type || toWorkItemType(item.requestType);
        var priority = type === 'incident' && item.severity
            ? (0, incidentSla_1.getPriorityFromSeverity)(item.severity)
            : toTaskPriority(item.priority);
        return {
            id: item.id.toString(),
            type: type,
            title: item.title,
            status: toWorkItemStatus(item.status, type),
            priority: priority,
            site: toTaskSite(item.site),
            assignedTo: item.assignedTo,
            assignedToUser: item.assignedToUser,
            assignedToId: (_a = item.assignedToId) !== null && _a !== void 0 ? _a : undefined,
            assignedToEmail: item.assignedToEmail,
            assignedToLoginName: item.assignedToLoginName,
            startDate: item.startDate,
            dueDate: item.dueDate,
            createdAt: item.createdAt || new Date().toISOString(),
            requestType: toRequestType(type),
            department: item.department || 'IT',
            description: item.description,
            createdBy: item.createdBy || createdByFallback,
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
        };
    }, []);
    (0, react_1.useEffect)(function () {
        var loadTasks = function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
            var sp, user_1, role, roleError_1, items, error_1;
            var _a;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!taskService)
                            return [2 /*return*/];
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 9, 10, 11]);
                        setIsLoading(true);
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, sp.web.currentUser()];
                    case 2:
                        user_1 = _b.sent();
                        setCurrentUserName(user_1.Title || '');
                        setCurrentUserEmail(user_1.Email || '');
                        setCurrentUserSpId((_a = user_1.Id) !== null && _a !== void 0 ? _a : null);
                        _b.label = 3;
                    case 3:
                        _b.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, (0, UserRoleService_1.getUserRole)(user_1.Email || '')];
                    case 4:
                        role = _b.sent();
                        setCanAssign((role === null || role === void 0 ? void 0 : role.canAssign) === true);
                        return [3 /*break*/, 6];
                    case 5:
                        roleError_1 = _b.sent();
                        console.warn('TaskBoard: role lookup failed; continuing with read-only assignment mode', roleError_1);
                        setCanAssign(false);
                        return [3 /*break*/, 6];
                    case 6:
                        console.log('LOAD: starting task loading process');
                        return [4 /*yield*/, taskService.checkAndEscalateSLAs()];
                    case 7:
                        _b.sent(); // Ensure SLA evaluation runs before fetching tasks
                        console.log('LOAD: SLA evaluation completed successfully');
                        return [4 /*yield*/, taskService.getTasks()];
                    case 8:
                        items = _b.sent();
                        console.log('LOAD: fetched tasks', items);
                        setWorkItems(items.map(function (item) { return mapServiceItemToTask(item, user_1.Title || ''); }));
                        return [3 /*break*/, 11];
                    case 9:
                        error_1 = _b.sent();
                        console.error('TaskBoard: load failed', error_1);
                        return [3 /*break*/, 11];
                    case 10:
                        setIsLoading(false);
                        return [7 /*endfinally*/];
                    case 11: return [2 /*return*/];
                }
            });
        }); };
        loadTasks();
    }, [mapServiceItemToTask, taskService]);
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
    var handleDragEnd = function (result) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var destination, draggableId, draggedItem, statuses, newStatus, error_2;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    destination = result.destination, draggableId = result.draggableId;
                    if (!destination)
                        return [2 /*return*/];
                    draggedItem = workItems.find(function (item) { return item.id === draggableId; });
                    if (!draggedItem)
                        return [2 /*return*/];
                    statuses = getStatusesForType(draggedItem.type);
                    newStatus = destination.droppableId;
                    if (statuses.indexOf(newStatus) === -1)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, taskService.updateTask(Number(draggableId), {
                            status: newStatus,
                            requestType: toRequestType(draggedItem.type),
                            severity: draggedItem.severity,
                            impact: draggedItem.impact,
                            affectedService: draggedItem.affectedService,
                        })];
                case 2:
                    _a.sent();
                    setWorkItems(function (current) { return reorderTasksAfterDrag(current, result, statuses); });
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    console.error('TaskBoard: drag update failed', error_2);
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
        var requestType = type === 'incident' ? 'Incident' : 'Task';
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
            requestType: requestType,
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
        var isNew, existingTask, effectiveTask_1, finalAssigneeId, finalAssigneeName, resolved, incidentType, incidentTypeId, derivedSeverity, derivedPriority, derivedDepartment, normaliseDate, shouldRebuildIncidentSla, incidentSla, payload, created, returnedId, items, persisted_1, updated_1, error_3;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        return tslib_1.__generator(this, function (_o) {
            switch (_o.label) {
                case 0:
                    _o.trys.push([0, 8, , 9]);
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
                    shouldRebuildIncidentSla = effectiveTask_1.type === 'incident'
                        && Boolean(derivedSeverity)
                        && (isNew
                            || (existingTask === null || existingTask === void 0 ? void 0 : existingTask.incidentTypeId) !== incidentTypeId
                            || !(existingTask === null || existingTask === void 0 ? void 0 : existingTask.responseDueDate)
                            || !(existingTask === null || existingTask === void 0 ? void 0 : existingTask.resolutionDueDate));
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
                    if (!isNew) return [3 /*break*/, 6];
                    return [4 /*yield*/, taskService.createTask(payload)];
                case 3:
                    created = _o.sent();
                    returnedId = (created === null || created === void 0 ? void 0 : created.id) != null
                        ? created.id.toString()
                        : undefined;
                    if (!!returnedId) return [3 /*break*/, 5];
                    console.warn('TaskBoard: createTask response did not include an ID; reloading list.', created);
                    return [4 /*yield*/, taskService.getTasks()];
                case 4:
                    items = _o.sent();
                    setWorkItems(items.map(function (item) { return mapServiceItemToTask(item, currentUserName); }));
                    return [2 /*return*/, tslib_1.__assign(tslib_1.__assign({}, effectiveTask_1), { id: "recovered_".concat(Date.now()) })];
                case 5:
                    persisted_1 = tslib_1.__assign(tslib_1.__assign({}, effectiveTask_1), { id: returnedId, priority: derivedPriority, assignedTo: finalAssigneeName, assignedToId: finalAssigneeId !== null && finalAssigneeId !== void 0 ? finalAssigneeId : undefined, startDate: payload.startDate, dueDate: payload.dueDate, requestType: toRequestType(effectiveTask_1.type), createdBy: currentUserName, department: derivedDepartment, severity: derivedSeverity, incidentTypeId: incidentTypeId, incidentType: incidentType, slaResponseMinutes: payload.slaResponseMinutes, slaResolutionMinutes: payload.slaResolutionMinutes, responseDueDate: payload.responseDueDate, resolutionDueDate: payload.resolutionDueDate, slaDeadline: payload.slaDeadline, slaStatus: payload.slaStatus });
                    setWorkItems(function (prev) { return tslib_1.__spreadArray(tslib_1.__spreadArray([], prev, true), [persisted_1], false); });
                    return [2 /*return*/, persisted_1];
                case 6: return [4 /*yield*/, taskService.updateTask(Number(effectiveTask_1.id), payload)];
                case 7:
                    _o.sent();
                    updated_1 = tslib_1.__assign(tslib_1.__assign({}, effectiveTask_1), { priority: derivedPriority, assignedTo: finalAssigneeName, assignedToId: finalAssigneeId !== null && finalAssigneeId !== void 0 ? finalAssigneeId : undefined, startDate: payload.startDate, dueDate: payload.dueDate, requestType: toRequestType(effectiveTask_1.type), department: derivedDepartment, severity: derivedSeverity, incidentTypeId: incidentTypeId, incidentType: incidentType, slaResponseMinutes: payload.slaResponseMinutes, slaResolutionMinutes: payload.slaResolutionMinutes, responseDueDate: payload.responseDueDate, resolutionDueDate: payload.resolutionDueDate, slaDeadline: payload.slaDeadline, slaStatus: payload.slaStatus });
                    setWorkItems(function (prev) { return prev.map(function (item) { return (item.id === effectiveTask_1.id ? updated_1 : item); }); });
                    return [2 /*return*/, updated_1];
                case 8:
                    error_3 = _o.sent();
                    console.error('TaskBoard: saveTask failed', error_3);
                    if (error_3 instanceof Error)
                        throw error_3;
                    throw new Error('Could not save work item to SharePoint.');
                case 9: return [2 /*return*/];
            }
        });
    }); };
    var handleDeleteTask = function (id) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var error_4;
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
                    error_4 = _a.sent();
                    console.error('TaskBoard: delete failed', error_4);
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
        setWorkItems(function (prev) { return prev.map(function (item) { return (item.id === id ? tslib_1.__assign(tslib_1.__assign({}, item), nextUpdates) : item); }); });
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
        if (isLoading) {
            return renderLoadingState('Loading tasks...');
        }
        switch (view) {
            case 'board':
                return (React.createElement(BoardView_1.default, { tasks: taskItems, statuses: TASK_STATUSES, type: "task", onTaskClick: handleTaskClick, onNewTask: handleNewTask }));
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
        if (isLoading) {
            return renderLoadingState('Loading dashboard...');
        }
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
                React.createElement("div", { style: { fontSize: '12px', color: theme_1.THEME.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em' } }, card.label),
                React.createElement("div", { style: { marginTop: '10px', fontSize: '30px', fontWeight: 700, color: theme_1.THEME.colors.textStrong } }, card.value))); })),
            React.createElement("div", { style: {
                    backgroundColor: theme_1.THEME.colors.panel,
                    border: "1px solid ".concat(theme_1.THEME.colors.border),
                    borderRadius: '16px',
                    overflow: 'hidden',
                } },
                React.createElement(ChartView_1.default, { tasks: taskItems, statuses: TASK_STATUSES }))));
    };
    var renderIncidentsView = function () {
        if (isLoading) {
            return renderLoadingState('Loading incidents...');
        }
        return (React.createElement("div", { style: { display: 'grid', gap: '16px' } },
            renderWorkspaceHeader('Incidents', 'Track operational disruptions with severity, ownership, and impact context.'),
            React.createElement("div", { style: {
                    backgroundColor: theme_1.THEME.colors.panel,
                    border: "1px solid ".concat(theme_1.THEME.colors.border),
                    borderRadius: '16px',
                    overflow: 'hidden',
                } },
                React.createElement(BoardView_1.default, { tasks: incidentItems, statuses: INCIDENT_STATUSES, type: "incident", onTaskClick: handleTaskClick, onNewTask: handleNewTask }))));
    };
    var renderSelectedView = function () {
        switch (selectedView) {
            case 'dashboard':
                return renderDashboardView();
            case 'incidents':
                return renderIncidentsView();
            case 'tasks':
            default:
                return renderTasksView();
        }
    };
    return (React.createElement(react_beautiful_dnd_1.DragDropContext, { onDragEnd: handleDragEnd },
        React.createElement(AppLayout_1.default, { selectedView: selectedView, onSelectView: setSelectedView }, renderSelectedView()),
        React.createElement(WorkItemModal_1.default, { task: modalTask, canAssign: canAssign, siteUrl: context.pageContext.web.absoluteUrl, context: context, currentUserName: currentUserName, currentUserSpId: currentUserSpId, onSave: handleSaveTask, onDelete: handleDeleteTask, onClose: handleCloseModal })));
};
exports.default = TaskBoard;
//# sourceMappingURL=TaskBoard.js.map