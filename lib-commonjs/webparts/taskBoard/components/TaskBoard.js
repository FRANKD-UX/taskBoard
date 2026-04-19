"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var react_beautiful_dnd_1 = require("react-beautiful-dnd");
var BoardView_1 = tslib_1.__importDefault(require("./BoardView"));
var TaskModal_1 = tslib_1.__importDefault(require("./TaskModal"));
var TableView_1 = tslib_1.__importDefault(require("./TableView"));
var CalendarView_1 = tslib_1.__importDefault(require("./CalendarView"));
var ChartView_1 = tslib_1.__importDefault(require("./ChartView"));
var GanttView_1 = tslib_1.__importDefault(require("./GanttView"));
var TaskService_1 = require("../../../services/TaskService");
var pnpjsConfig_1 = require("../../../pnpjsConfig");
var UserRoleService_1 = require("../../../services/UserRoleService");
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
var TEMP_ID_PREFIX = 'temp_';
var TASK_STATUSES = ['Unassigned', 'Backlog', 'ThisWeek', 'InProgress', 'Completed'];
var VIEW_TABS = [
    { key: 'board', label: 'Board' },
    { key: 'table', label: 'Table' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'gantt', label: 'Gantt' },
    { key: 'chart', label: 'Chart' },
];
// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
var toTaskStatus = function (value) {
    if (value && TASK_STATUSES.indexOf(value) > -1) {
        return value;
    }
    return 'Unassigned';
};
var getTodayIso = function () {
    var d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
};
var groupTasksByStatus = function (tasks) {
    var grouped = {
        Unassigned: [], Backlog: [], ThisWeek: [], InProgress: [], Completed: [],
    };
    tasks.forEach(function (task) {
        if (TASK_STATUSES.indexOf(task.status) > -1) {
            grouped[task.status].push(task);
        }
        else {
            grouped.Unassigned.push(task);
        }
    });
    return grouped;
};
var reorderTasksAfterDrag = function (tasks, result) {
    var source = result.source, destination = result.destination;
    if (!destination)
        return tasks;
    var srcStatus = source.droppableId;
    var dstStatus = destination.droppableId;
    if (TASK_STATUSES.indexOf(srcStatus) === -1 ||
        TASK_STATUSES.indexOf(dstStatus) === -1 ||
        (srcStatus === dstStatus && source.index === destination.index)) {
        return tasks;
    }
    var grouped = groupTasksByStatus(tasks);
    var srcTasks = grouped[srcStatus].slice();
    var dstTasks = srcStatus === dstStatus ? srcTasks : grouped[dstStatus].slice();
    var moved = srcTasks.splice(source.index, 1)[0];
    if (!moved)
        return tasks;
    dstTasks.splice(destination.index, 0, tslib_1.__assign(tslib_1.__assign({}, moved), { status: dstStatus }));
    grouped[srcStatus] = srcTasks;
    grouped[dstStatus] = dstTasks;
    return TASK_STATUSES.reduce(function (acc, s) { return acc.concat(grouped[s]); }, []);
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
                                if (!value) {
                                    return [2 /*return*/, null];
                                }
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
                maybeEmail = lower.indexOf('|') > -1 ? ((_c = normalizedLoginName.split('|').pop()) === null || _c === void 0 ? void 0 : _c.trim()) || '' : '';
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
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
var TaskBoard = function (_a) {
    var context = _a.context;
    var _b = (0, react_1.useState)([]), tasks = _b[0], setTasks = _b[1];
    var _c = (0, react_1.useState)(null), modalTask = _c[0], setModalTask = _c[1];
    var _d = (0, react_1.useState)('board'), activeView = _d[0], setActiveView = _d[1];
    var _e = (0, react_1.useState)('board'), displayedView = _e[0], setDisplayedView = _e[1];
    var _f = (0, react_1.useState)(true), isViewVisible = _f[0], setIsViewVisible = _f[1];
    var _g = (0, react_1.useState)(null), hoveredTab = _g[0], setHoveredTab = _g[1];
    var _h = (0, react_1.useState)(false), canAssign = _h[0], setCanAssign = _h[1];
    var _j = (0, react_1.useState)(''), currentUserName = _j[0], setCurrentUserName = _j[1];
    var _k = (0, react_1.useState)(true), isLoading = _k[0], setIsLoading = _k[1];
    var taskService = (0, react_1.useMemo)(function () { return new TaskService_1.TaskService(); }, []);
    // Make the SPFx context available on window so PeoplePicker's
    // getSPHttpClient() helper can reach it without prop-drilling.
    (0, react_1.useEffect)(function () {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.spfxContext = context;
    }, [context]);
    // ---------------------------------------------------------------------------
    // Initial data load
    // ---------------------------------------------------------------------------
    (0, react_1.useEffect)(function () {
        var loadTasks = function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
            var sp, user_1, role, roleError_1, data, error_1;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, 8, 9]);
                        setIsLoading(true);
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, sp.web.currentUser()];
                    case 1:
                        user_1 = _a.sent();
                        setCurrentUserName(user_1.Title || '');
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, (0, UserRoleService_1.getUserRole)(user_1.Email || '')];
                    case 3:
                        role = _a.sent();
                        setCanAssign((role === null || role === void 0 ? void 0 : role.canAssign) === true);
                        return [3 /*break*/, 5];
                    case 4:
                        roleError_1 = _a.sent();
                        // Role lookup should not block task loading.
                        console.warn('TaskBoard: role lookup failed; continuing with read-only assignment mode', roleError_1);
                        setCanAssign(false);
                        return [3 /*break*/, 5];
                    case 5: return [4 /*yield*/, taskService.getTasks()];
                    case 6:
                        data = _a.sent();
                        setTasks(data.map(function (t) { return ({
                            id: t.id.toString(),
                            title: t.title,
                            status: toTaskStatus(t.status),
                            priority: t.priority,
                            assignedTo: t.assignedTo,
                            assignedToId: t.assignedToId,
                            assignedToEmail: t.assignedToEmail,
                            assignedToLoginName: t.assignedToLoginName,
                            startDate: t.startDate,
                            dueDate: t.dueDate,
                            createdAt: new Date().toISOString(),
                            requestType: t.requestType,
                            department: t.department,
                            description: t.description,
                            createdBy: user_1.Title,
                        }); }));
                        return [3 /*break*/, 9];
                    case 7:
                        error_1 = _a.sent();
                        console.error('TaskBoard: load failed', error_1);
                        return [3 /*break*/, 9];
                    case 8:
                        setIsLoading(false);
                        return [7 /*endfinally*/];
                    case 9: return [2 /*return*/];
                }
            });
        }); };
        loadTasks();
    }, [taskService]);
    // ---------------------------------------------------------------------------
    // View transition fade
    // ---------------------------------------------------------------------------
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
    // ---------------------------------------------------------------------------
    // Drag and drop
    // ---------------------------------------------------------------------------
    var handleDragEnd = function (result) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var destination, draggableId, newStatus, error_2;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    destination = result.destination, draggableId = result.draggableId;
                    if (!destination)
                        return [2 /*return*/];
                    newStatus = destination.droppableId;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, taskService.updateTask(Number(draggableId), { status: newStatus })];
                case 2:
                    _a.sent();
                    setTasks(function (current) { return reorderTasksAfterDrag(current, result); });
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    console.error('TaskBoard: drag update failed', error_2);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    // ---------------------------------------------------------------------------
    // Modal triggers
    // ---------------------------------------------------------------------------
    /**
     * Opens the modal for an EXISTING task (card click, calendar click, etc.)
     */
    var handleTaskClick = function (task) {
        setModalTask(task);
    };
    /**
     * Opens the modal in NEW TASK mode.
     * We build a minimal temp Task so TaskModal gets a properly shaped object.
     */
    var handleNewTask = function (status) {
        var today = getTodayIso();
        var draft = {
            id: "".concat(TEMP_ID_PREFIX).concat(Date.now()),
            title: '',
            status: status,
            priority: 'Medium',
            startDate: today,
            dueDate: undefined,
            createdAt: new Date().toISOString(),
            requestType: 'Task',
            department: 'IT',
            description: '',
            assignedTo: '',
            createdBy: currentUserName,
        };
        setModalTask(draft);
    };
    var handleCloseModal = function () {
        setModalTask(null);
    };
    // ---------------------------------------------------------------------------
    // Save — handles both create and update via TaskModal's onSave prop
    // ---------------------------------------------------------------------------
    var handleSaveTask = function (task) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var isNew, finalAssigneeId, finalAssigneeName, resolved, message, normaliseDate, payload, created, persisted_1, updated_1, error_3;
        var _a;
        return tslib_1.__generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 7, , 8]);
                    isNew = task.id.startsWith(TEMP_ID_PREFIX);
                    finalAssigneeId = (_a = task.assignedToId) !== null && _a !== void 0 ? _a : null;
                    finalAssigneeName = task.assignedTo || '';
                    if (!((!finalAssigneeId || finalAssigneeId <= 0) && (task.assignedToEmail || task.assignedToLoginName))) return [3 /*break*/, 2];
                    return [4 /*yield*/, resolveSharePointUserId(task.assignedToEmail || '', task.assignedToLoginName || '')];
                case 1:
                    resolved = _b.sent();
                    if (resolved)
                        finalAssigneeId = resolved;
                    _b.label = 2;
                case 2:
                    if (!finalAssigneeId || finalAssigneeId <= 0) {
                        if (task.assignedToEmail || task.assignedToLoginName || task.assignedTo) {
                            message = 'Could not resolve selected user to a SharePoint account. Select a valid user and try again.';
                            console.warn('TaskBoard: could not resolve selected assignee to a SharePoint user ID.', {
                                email: task.assignedToEmail,
                                loginName: task.assignedToLoginName,
                                name: task.assignedTo
                            });
                            throw new Error(message);
                        }
                        finalAssigneeId = null;
                        finalAssigneeName = '';
                    }
                    normaliseDate = function (value) {
                        if (!value)
                            return '';
                        if (/^\d{4}-\d{2}-\d{2}$/.test(value))
                            return value;
                        var parsed = new Date(value);
                        return isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
                    };
                    payload = {
                        title: task.title,
                        status: task.status,
                        priority: task.priority,
                        assignedToId: finalAssigneeId,
                        startDate: normaliseDate(task.startDate) || getTodayIso(),
                        dueDate: normaliseDate(task.dueDate),
                        description: task.description || '',
                        requestType: task.requestType || 'Task',
                        department: task.department || 'IT',
                    };
                    if (!isNew) return [3 /*break*/, 4];
                    return [4 /*yield*/, taskService.createTask(payload)];
                case 3:
                    created = _b.sent();
                    if (!(created === null || created === void 0 ? void 0 : created.id)) {
                        console.error('TaskBoard: createTask returned no id', created);
                        return [2 /*return*/, null];
                    }
                    persisted_1 = tslib_1.__assign(tslib_1.__assign({}, task), { id: created.id.toString(), assignedTo: finalAssigneeName, assignedToId: finalAssigneeId !== null && finalAssigneeId !== void 0 ? finalAssigneeId : undefined, startDate: payload.startDate, dueDate: payload.dueDate, createdBy: currentUserName });
                    setTasks(function (prev) { return tslib_1.__spreadArray(tslib_1.__spreadArray([], prev, true), [persisted_1], false); });
                    return [2 /*return*/, persisted_1];
                case 4: return [4 /*yield*/, taskService.updateTask(Number(task.id), payload)];
                case 5:
                    _b.sent();
                    updated_1 = tslib_1.__assign(tslib_1.__assign({}, task), { assignedTo: finalAssigneeName, assignedToId: finalAssigneeId !== null && finalAssigneeId !== void 0 ? finalAssigneeId : undefined, startDate: payload.startDate, dueDate: payload.dueDate });
                    setTasks(function (prev) { return prev.map(function (t) { return (t.id === task.id ? updated_1 : t); }); });
                    return [2 /*return*/, updated_1];
                case 6: return [3 /*break*/, 8];
                case 7:
                    error_3 = _b.sent();
                    console.error('TaskBoard: saveTask failed', error_3);
                    if (error_3 instanceof Error) {
                        throw error_3;
                    }
                    throw new Error('Could not save task to SharePoint.');
                case 8: return [2 /*return*/];
            }
        });
    }); };
    // ---------------------------------------------------------------------------
    // Delete
    // ---------------------------------------------------------------------------
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
                    setTasks(function (prev) { return prev.filter(function (t) { return t.id !== id; }); });
                    return [3 /*break*/, 4];
                case 3:
                    error_4 = _a.sent();
                    console.error('TaskBoard: delete failed', error_4);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    // ---------------------------------------------------------------------------
    // TableView still uses the old per-field updateTask signature — keep it
    // ---------------------------------------------------------------------------
    var handleUpdateTask = function (id, updates) {
        if (!canAssign && updates.assignedTo !== undefined) {
            var assignedTo = updates.assignedTo, assignedToId = updates.assignedToId, assignedToEmail = updates.assignedToEmail, assignedToLoginName = updates.assignedToLoginName, rest = tslib_1.__rest(updates, ["assignedTo", "assignedToId", "assignedToEmail", "assignedToLoginName"]);
            updates = rest;
        }
        setTasks(function (prev) { return prev.map(function (t) { return (t.id === id ? tslib_1.__assign(tslib_1.__assign({}, t), updates) : t); }); });
    };
    // ---------------------------------------------------------------------------
    // Render helpers
    // ---------------------------------------------------------------------------
    var renderActiveView = function (view) {
        if (isLoading) {
            return (React.createElement("div", { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#f8fafc' } }, "Loading tasks..."));
        }
        switch (view) {
            case 'board':
                return (React.createElement(BoardView_1.default, { tasks: tasks, statuses: TASK_STATUSES, onTaskClick: handleTaskClick, onNewTask: handleNewTask }));
            case 'table':
                return (React.createElement(TableView_1.default, { tasks: tasks, statuses: TASK_STATUSES, updateTask: handleUpdateTask, deleteTask: handleDeleteTask, canAssign: canAssign }));
            case 'calendar':
                return (React.createElement(CalendarView_1.default, { tasks: tasks, onTaskClick: function (id) {
                        var task = tasks.find(function (t) { return t.id === id; });
                        if (task)
                            handleTaskClick(task);
                    } }));
            case 'gantt':
                return (React.createElement(GanttView_1.default, { tasks: tasks, statuses: TASK_STATUSES, onTaskClick: function (id) {
                        var task = tasks.find(function (t) { return t.id === id; });
                        if (task)
                            handleTaskClick(task);
                    } }));
            case 'chart':
                return React.createElement(ChartView_1.default, { tasks: tasks, statuses: TASK_STATUSES });
            default:
                return React.createElement(React.Fragment, null);
        }
    };
    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (React.createElement(react_beautiful_dnd_1.DragDropContext, { onDragEnd: handleDragEnd },
        React.createElement("div", { style: { width: '100%', backgroundColor: '#171c33' } },
            React.createElement("div", { style: { display: 'flex', gap: '8px', padding: '12px 16px 0 16px' } }, VIEW_TABS.map(function (tab) { return (React.createElement("button", { key: tab.key, type: "button", onClick: function () { return setActiveView(tab.key); }, onMouseEnter: function () { return setHoveredTab(tab.key); }, onMouseLeave: function () { return setHoveredTab(null); }, style: {
                    backgroundColor: activeView === tab.key ? '#334155' : hoveredTab === tab.key ? '#27324f' : '#1f2a44',
                    color: activeView === tab.key ? '#f8fafc' : '#e2e8f0',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontWeight: activeView === tab.key ? 700 : 500,
                    transition: 'background-color 160ms ease, color 160ms ease, transform 120ms ease',
                    transform: hoveredTab === tab.key ? 'translateY(-1px)' : 'translateY(0)',
                } }, tab.label)); })),
            React.createElement("div", { style: {
                    transition: 'opacity 180ms ease, transform 180ms ease',
                    opacity: isViewVisible ? 1 : 0,
                    transform: isViewVisible ? 'translateY(0)' : 'translateY(4px)',
                } }, renderActiveView(displayedView))),
        React.createElement(TaskModal_1.default, { task: modalTask, canAssign: canAssign, siteUrl: context.pageContext.web.absoluteUrl, currentUserName: currentUserName, onSave: handleSaveTask, onDelete: handleDeleteTask, onClose: handleCloseModal })));
};
exports.default = TaskBoard;
//# sourceMappingURL=TaskBoard.js.map