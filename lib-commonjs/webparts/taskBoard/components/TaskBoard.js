"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var react_beautiful_dnd_1 = require("react-beautiful-dnd");
var BoardView_1 = tslib_1.__importDefault(require("./BoardView"));
var TaskPanel_1 = tslib_1.__importDefault(require("./TaskPanel"));
var TableView_1 = tslib_1.__importDefault(require("./TableView"));
var CalendarView_1 = tslib_1.__importDefault(require("./CalendarView"));
var ChartView_1 = tslib_1.__importDefault(require("./ChartView"));
var GanttView_1 = tslib_1.__importDefault(require("./GanttView"));
var TaskService_1 = require("../../../services/TaskService");
var pnpjsConfig_1 = require("../../../pnpjsConfig");
var UserRoleService_1 = require("../../../services/UserRoleService");
var mockTasks = [
    {
        id: '1',
        title: 'Fix network issue',
        status: 'InProgress',
        priority: 'High',
        assignedTo: 'Frank Ndlovu',
        dueDate: '2026-04-15',
        createdAt: '2026-04-01',
        requestType: 'Incident',
        department: 'IT',
        description: 'Intermittent WAN drop on branch edge router.',
        createdBy: 'Frank Ndlovu'
    },
    {
        id: '2',
        title: 'Update billing system',
        status: 'Backlog',
        priority: 'Medium',
        assignedTo: 'Jacobus Coetzee',
        dueDate: '2026-04-18',
        createdAt: '2026-04-02',
        requestType: 'Task',
        department: 'Finance',
        description: 'Apply tax rule updates for April release.',
        createdBy: 'Jacobus Coetzee'
    },
    {
        id: '3',
        title: 'Deploy new router config',
        status: 'Completed',
        priority: 'Low',
        assignedTo: 'Nhalnhla Mkhithi',
        dueDate: '2026-04-10',
        createdAt: '2026-04-03',
        requestType: 'Task',
        department: 'Operations',
        description: 'Roll out approved QoS profile to regional hubs.',
        createdBy: 'Nhalnhla Mkhithi'
    }
];
var taskStatuses = ['Unassigned', 'Backlog', 'ThisWeek', 'InProgress', 'Completed'];
var toTaskStatus = function (value) {
    if (value && taskStatuses.indexOf(value) > -1) {
        return value;
    }
    return 'Unassigned';
};
var viewTabs = [
    { key: 'board', label: 'Board' },
    { key: 'table', label: 'Table' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'gantt', label: 'Gantt' },
    { key: 'chart', label: 'Chart' }
];
var groupTasksByStatus = function (tasks) {
    var grouped = {
        Unassigned: [],
        Backlog: [],
        ThisWeek: [],
        InProgress: [],
        Completed: []
    };
    tasks.forEach(function (task) {
        if (taskStatuses.indexOf(task.status) > -1) {
            grouped[task.status].push(task);
        }
        else {
            grouped.Unassigned.push(task);
        }
    });
    return grouped;
};
var reorderTasksAfterDrag = function (items, result) {
    var source = result.source, destination = result.destination;
    if (!destination) {
        return items;
    }
    var sourceStatus = source.droppableId;
    var destinationStatus = destination.droppableId;
    if (taskStatuses.indexOf(sourceStatus) === -1 ||
        taskStatuses.indexOf(destinationStatus) === -1 ||
        (sourceStatus === destinationStatus && source.index === destination.index)) {
        return items;
    }
    var grouped = groupTasksByStatus(items);
    var sourceTasks = grouped[sourceStatus].slice();
    var destinationTasks = sourceStatus === destinationStatus ? sourceTasks : grouped[destinationStatus].slice();
    var movedTask = sourceTasks.splice(source.index, 1)[0];
    if (!movedTask) {
        return items;
    }
    destinationTasks.splice(destination.index, 0, tslib_1.__assign(tslib_1.__assign({}, movedTask), { status: destinationStatus }));
    grouped[sourceStatus] = sourceTasks;
    grouped[destinationStatus] = destinationTasks;
    return taskStatuses.reduce(function (acc, status) {
        return acc.concat(grouped[status]);
    }, []);
};
var TaskBoard = function () {
    var _a = (0, react_1.useState)([]), tasks = _a[0], setTasks = _a[1];
    var _b = (0, react_1.useState)(null), selectedTaskId = _b[0], setSelectedTaskId = _b[1];
    var _c = (0, react_1.useState)('board'), activeView = _c[0], setActiveView = _c[1];
    var _d = (0, react_1.useState)('board'), displayedView = _d[0], setDisplayedView = _d[1];
    var _e = (0, react_1.useState)(true), isViewVisible = _e[0], setIsViewVisible = _e[1];
    var _f = (0, react_1.useState)(null), hoveredTab = _f[0], setHoveredTab = _f[1];
    var _g = (0, react_1.useState)(false), canAssign = _g[0], setCanAssign = _g[1];
    var _h = (0, react_1.useState)(''), currentUserName = _h[0], setCurrentUserName = _h[1];
    var _j = (0, react_1.useState)(undefined), currentUserId = _j[0], setCurrentUserId = _j[1];
    (0, react_1.useEffect)(function () {
        var loadTasks = function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
            var service, sp, currentUser, roleData, hasAssignPermission, loadedTasks;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        service = new TaskService_1.TaskService();
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, sp.web.currentUser()];
                    case 1:
                        currentUser = _a.sent();
                        setCurrentUserName(currentUser.Title || currentUser.Email || '');
                        setCurrentUserId(currentUser.Id);
                        return [4 /*yield*/, (0, UserRoleService_1.getUserRole)(currentUser.Email)];
                    case 2:
                        roleData = _a.sent();
                        console.log('CURRENT USER:', currentUser);
                        console.log('ROLE DATA:', roleData);
                        hasAssignPermission = (roleData === null || roleData === void 0 ? void 0 : roleData.canAssign) === true;
                        setCanAssign(hasAssignPermission);
                        return [4 /*yield*/, service.getTasks()];
                    case 3:
                        loadedTasks = _a.sent();
                        console.log('TASK DATA:', loadedTasks);
                        window.taskBoardDebug = {
                            currentUser: currentUser,
                            roleData: roleData,
                            loadedTasks: loadedTasks,
                            canAssign: hasAssignPermission,
                            loadError: null
                        };
                        setTasks(loadedTasks.map(function (task) { return ({
                            id: task.id.toString(),
                            title: task.title || 'Untitled Task',
                            status: toTaskStatus(task.status),
                            priority: task.priority === 'High' || task.priority === 'Low' ? task.priority : 'Medium',
                            assignedTo: task.assignedTo || '',
                            assignedToId: task.assignedToId,
                            dueDate: task.dueDate || '',
                            createdAt: task.startDate || new Date().toISOString(),
                            requestType: task.requestType || 'Task',
                            department: task.department || 'IT',
                            description: task.description || '',
                            createdBy: currentUser.Title || currentUser.Email || ''
                        }); }));
                        return [2 /*return*/];
                }
            });
        }); };
        loadTasks().catch(function (error) {
            console.error('Failed to load tasks from SharePoint.', error);
            window.taskBoardDebug = {
                loadError: error,
                loadedTasks: [],
                fallbackTasks: mockTasks,
                canAssign: false
            };
            setTasks(mockTasks);
        });
    }, []);
    (0, react_1.useEffect)(function () {
        console.log('TASK DATA:', tasks);
    }, [tasks]);
    (0, react_1.useEffect)(function () {
        window.taskBoardDebug = tslib_1.__assign(tslib_1.__assign({}, window.taskBoardDebug), { tasks: tasks, canAssign: canAssign, selectedTaskId: selectedTaskId });
    }, [tasks, canAssign, selectedTaskId]);
    (0, react_1.useEffect)(function () {
        if (activeView === displayedView) {
            return;
        }
        setIsViewVisible(false);
        var timeout = setTimeout(function () {
            setDisplayedView(activeView);
            setIsViewVisible(true);
        }, 120);
        return function () { return clearTimeout(timeout); };
    }, [activeView, displayedView]);
    var selectedTask = (0, react_1.useMemo)(function () {
        if (selectedTaskId === null) {
            return null;
        }
        return tasks.find(function (task) { return task.id === selectedTaskId; }) || null;
    }, [selectedTaskId, tasks]);
    var handleDragEnd = function (result) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var source, destination, draggableId, newStatus, service, error_1;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    source = result.source, destination = result.destination, draggableId = result.draggableId;
                    if (!destination)
                        return [2 /*return*/];
                    newStatus = destination.droppableId;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    service = new TaskService_1.TaskService();
                    // Persist to SharePoint FIRST
                    return [4 /*yield*/, service.updateTask(Number(draggableId), {
                            status: newStatus
                        })];
                case 2:
                    // Persist to SharePoint FIRST
                    _a.sent();
                    // Then update UI
                    setTasks(function (currentTasks) {
                        return reorderTasksAfterDrag(currentTasks, result);
                    });
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    console.error("DRAG UPDATE FAILED:", error_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var updateTask = function (id, updates) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var service, safeUpdates_1, error_2;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    service = new TaskService_1.TaskService();
                    safeUpdates_1 = tslib_1.__assign({}, updates);
                    // Enforce permissions
                    if (!canAssign && safeUpdates_1.assignedTo !== undefined) {
                        delete safeUpdates_1.assignedTo;
                    }
                    if (!canAssign && safeUpdates_1.assignedToId !== undefined) {
                        delete safeUpdates_1.assignedToId;
                    }
                    //Persist to SharePoint
                    return [4 /*yield*/, service.updateTask(Number(id), {
                            title: safeUpdates_1.title,
                            status: safeUpdates_1.status,
                            priority: safeUpdates_1.priority,
                            assignedToId: safeUpdates_1.assignedToId,
                            dueDate: safeUpdates_1.dueDate,
                            description: safeUpdates_1.description,
                            requestType: safeUpdates_1.requestType,
                            department: safeUpdates_1.department
                        })];
                case 1:
                    //Persist to SharePoint
                    _a.sent();
                    // Then update UI
                    setTasks(function (currentTasks) {
                        return currentTasks.map(function (task) {
                            return task.id === id ? tslib_1.__assign(tslib_1.__assign({}, task), safeUpdates_1) : task;
                        });
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    console.error("UPDATE TASK FAILED:", error_2);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var createTask = function (task) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var service, defaultAssignee, payload, created, newTask_1, error_3;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    service = new TaskService_1.TaskService();
                    defaultAssignee = currentUserName || task.assignedTo || '';
                    payload = tslib_1.__assign(tslib_1.__assign({}, task), { assignedTo: !canAssign
                            ? defaultAssignee
                            : task.requestType === 'Incident'
                                ? defaultAssignee
                                : task.assignedTo, assignedToId: !canAssign
                            ? currentUserId
                            : task.requestType === 'Incident'
                                ? currentUserId
                                : task.assignedToId, requestType: task.requestType || 'Task', department: task.department || 'IT', description: task.description || '', createdBy: task.createdBy || currentUserName });
                    return [4 /*yield*/, service.createTask(payload)];
                case 1:
                    created = _a.sent();
                    if (!created) {
                        console.error("Create returned null — stopping UI update");
                        return [2 /*return*/, null];
                    }
                    newTask_1 = {
                        id: created.id.toString(),
                        title: created.title || 'Untitled Task',
                        status: toTaskStatus(created.status),
                        priority: created.priority === 'High' || created.priority === 'Low'
                            ? created.priority
                            : 'Medium',
                        assignedTo: created.assignedTo || '',
                        assignedToId: created.assignedToId,
                        dueDate: created.dueDate || '',
                        createdAt: created.startDate || new Date().toISOString(),
                        requestType: created.requestType || 'Task',
                        department: created.department || 'IT',
                        description: created.description || '',
                        createdBy: created.createdBy || currentUserName
                    };
                    // UPDATE STATE WITH REAL DATA
                    setTasks(function (current) { return current.concat(newTask_1); });
                    return [2 /*return*/, newTask_1];
                case 2:
                    error_3 = _a.sent();
                    console.error('CREATE TASK FAILED:', error_3);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var deleteTask = function (id) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var service, error_4;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    service = new TaskService_1.TaskService();
                    return [4 /*yield*/, service.deleteTask(Number(id))];
                case 1:
                    _a.sent(); // 🔥 convert string → number
                    setTasks(function (currentTasks) {
                        return currentTasks.filter(function (task) { return task.id !== id; });
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_4 = _a.sent();
                    console.error("DELETE TASK FAILED:", error_4);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var handleTaskClick = function (taskId) {
        setSelectedTaskId(taskId);
    };
    var handleClosePanel = function () {
        setSelectedTaskId(null);
    };
    var renderPlaceholderView = function (label) {
        return (React.createElement("div", { style: {
                width: '100%',
                padding: '20px 16px',
                color: '#e2e8f0',
                backgroundColor: '#171c33'
            } },
            label,
            " view coming soon."));
    };
    var renderActiveView = function (view) {
        if (view === 'board') {
            return React.createElement(BoardView_1.default, { tasks: tasks, statuses: taskStatuses, onTaskClick: handleTaskClick, createTask: createTask });
        }
        if (view === 'table') {
            return React.createElement(TableView_1.default, { tasks: tasks, statuses: taskStatuses, updateTask: updateTask, deleteTask: deleteTask, canAssign: canAssign });
        }
        if (view === 'calendar') {
            return React.createElement(CalendarView_1.default, { tasks: tasks, onTaskClick: handleTaskClick });
        }
        if (view === 'gantt') {
            return React.createElement(GanttView_1.default, { tasks: tasks, statuses: taskStatuses, onTaskClick: handleTaskClick });
        }
        return React.createElement(ChartView_1.default, { tasks: tasks, statuses: taskStatuses });
    };
    return (React.createElement(react_beautiful_dnd_1.DragDropContext, { onDragEnd: handleDragEnd },
        React.createElement("div", { style: { width: '100%', backgroundColor: '#171c33' } },
            React.createElement("div", { style: { display: 'flex', gap: '8px', padding: '12px 16px 0 16px' } }, viewTabs.map(function (tab) { return (React.createElement("button", { key: tab.key, type: "button", onClick: function () { return setActiveView(tab.key); }, onMouseEnter: function () { return setHoveredTab(tab.key); }, onMouseLeave: function () { return setHoveredTab(null); }, style: {
                    backgroundColor: activeView === tab.key ? '#334155' : hoveredTab === tab.key ? '#27324f' : '#1f2a44',
                    color: activeView === tab.key ? '#f8fafc' : '#e2e8f0',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontWeight: activeView === tab.key ? 700 : 500,
                    transition: 'background-color 160ms ease, color 160ms ease, transform 120ms ease',
                    transform: hoveredTab === tab.key ? 'translateY(-1px)' : 'translateY(0)'
                } }, tab.label)); })),
            React.createElement("div", { style: {
                    transition: 'opacity 180ms ease, transform 180ms ease',
                    opacity: isViewVisible ? 1 : 0,
                    transform: isViewVisible ? 'translateY(0)' : 'translateY(4px)'
                } }, renderActiveView(displayedView))),
        React.createElement(TaskPanel_1.default, { selectedTask: selectedTask, onClose: handleClosePanel, updateTask: updateTask, deleteTask: deleteTask, canAssign: canAssign })));
};
exports.default = TaskBoard;
//# sourceMappingURL=TaskBoard.js.map