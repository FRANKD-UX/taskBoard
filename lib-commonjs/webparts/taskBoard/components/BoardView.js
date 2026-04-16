"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var react_beautiful_dnd_1 = require("react-beautiful-dnd");
var boardStyle = {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    padding: '12px 8px 16px 8px',
    scrollBehavior: 'smooth'
};
var columnStyle = {
    width: 'clamp(248px, 24vw, 320px)',
    flex: '1 1 clamp(248px, 24vw, 320px)',
    minWidth: '248px',
    maxWidth: '320px',
    flexShrink: 0
};
var getInitials = function (name) {
    return name
        .split(' ')
        .filter(function (part) { return part.length > 0; })
        .slice(0, 2)
        .map(function (part) { return part.charAt(0).toUpperCase(); })
        .join('');
};
var avatarPalette = ['#2563eb', '#7c3aed', '#0ea5e9', '#f59e0b', '#22c55e', '#ec4899', '#14b8a6'];
var getAvatarColor = function (name) {
    if (!name) {
        return '#64748b';
    }
    var hash = name.split('').reduce(function (acc, char) { return acc + char.charCodeAt(0); }, 0);
    return avatarPalette[hash % avatarPalette.length];
};
var getPriorityColor = function (priority) {
    switch (priority) {
        case 'High':
            return '#ef4444';
        case 'Medium':
            return '#f59e0b';
        case 'Low':
            return '#22c55e';
        default:
            return '#6b7280';
    }
};
var getStatusColor = function (status) {
    switch (status) {
        case 'Unassigned':
            return '#6b7280';
        case 'Backlog':
            return '#7c3aed';
        case 'ThisWeek':
            return '#0ea5e9';
        case 'InProgress':
            return '#f59e0b';
        case 'Completed':
            return '#22c55e';
        default:
            return '#6b7280';
    }
};
var groupTasksByStatus = function (tasks, statuses) {
    var grouped = statuses.reduce(function (acc, status) {
        acc[status] = [];
        return acc;
    }, {});
    tasks.forEach(function (task) {
        if (statuses.indexOf(task.status) > -1) {
            grouped[task.status].push(task);
        }
        else {
            grouped.Unassigned.push(task);
        }
    });
    return grouped;
};
var BoardView = function (_a) {
    var tasks = _a.tasks, statuses = _a.statuses, onTaskClick = _a.onTaskClick, createTask = _a.createTask;
    var tasksByStatus = groupTasksByStatus(tasks, statuses);
    var _b = (0, react_1.useState)(null), hoveredTaskId = _b[0], setHoveredTaskId = _b[1];
    var _c = (0, react_1.useState)(null), hoveredColumn = _c[0], setHoveredColumn = _c[1];
    var _d = (0, react_1.useState)({}), enteringTaskIds = _d[0], setEnteringTaskIds = _d[1];
    (0, react_1.useEffect)(function () {
        if (Object.keys(enteringTaskIds).length === 0) {
            return;
        }
        var frame = requestAnimationFrame(function () {
            setEnteringTaskIds({});
        });
        return function () { return cancelAnimationFrame(frame); };
    }, [enteringTaskIds]);
    var updateTask = function (id, updates) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var service, safeUpdates_1, error_1;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    service = new TaskService();
                    safeUpdates_1 = tslib_1.__assign({}, updates);
                    // 🔐 Enforce permissions
                    if (!canAssign && safeUpdates_1.assignedTo !== undefined) {
                        delete safeUpdates_1.assignedTo;
                    }
                    if (!canAssign && safeUpdates_1.assignedToId !== undefined) {
                        delete safeUpdates_1.assignedToId;
                    }
                    // Persist to SharePoint
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
                    // Persist to SharePoint
                    _a.sent();
                    //Then update UI
                    setTasks(function (currentTasks) {
                        return currentTasks.map(function (task) {
                            return task.id === id ? tslib_1.__assign(tslib_1.__assign({}, task), safeUpdates_1) : task;
                        });
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error("UPDATE TASK FAILED:", error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    {
        console.error('Task creation failed');
    }
    console.log("Calling createTask...");
    console.log("Create result:", created);
};
return (React.createElement("div", { style: { width: '100%', backgroundColor: '#171c33' } },
    React.createElement("div", { style: boardStyle }, statuses.map(function (status) { return (React.createElement(react_beautiful_dnd_1.Droppable, { key: status, droppableId: status }, function (dropProvided, dropSnapshot) { return (React.createElement("div", tslib_1.__assign({ ref: dropProvided.innerRef }, dropProvided.droppableProps, { onMouseEnter: function () { return setHoveredColumn(status); }, onMouseLeave: function () { return setHoveredColumn(null); }, style: tslib_1.__assign(tslib_1.__assign({}, columnStyle), { backgroundColor: dropSnapshot.isDraggingOver ? '#3a4161' : hoveredColumn === status ? '#343a59' : '#2c2f4a', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '300px', boxShadow: dropSnapshot.isDraggingOver ? 'inset 0 0 0 1px rgba(59, 130, 246, 0.5)' : 'none', transition: 'background-color 160ms ease, box-shadow 160ms ease' }) }),
        React.createElement("div", { style: { height: '6px', borderRadius: '999px', backgroundColor: getStatusColor(status) } }),
        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' } },
                React.createElement("span", { style: {
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(status),
                        display: 'inline-block'
                    } }),
                React.createElement("span", null, status)),
            React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                React.createElement("span", { style: {
                        color: '#e2e8f0',
                        backgroundColor: '#1f2a44',
                        border: '1px solid #475569',
                        borderRadius: '999px',
                        padding: '2px 8px',
                        fontSize: '12px'
                    } }, tasksByStatus[status].length),
                React.createElement("button", { type: "button", onClick: function () { return handleAddTask(status); }, style: {
                        width: '24px',
                        height: '24px',
                        borderRadius: '999px',
                        border: '1px solid #475569',
                        backgroundColor: '#1f2a44',
                        color: '#e2e8f0',
                        cursor: 'pointer',
                        lineHeight: 1
                    }, "aria-label": "Add task to ".concat(status) }, "+"))),
        tasksByStatus[status].length === 0 && (React.createElement("div", { style: { color: '#94a3b8', fontSize: '12px', padding: '8px 2px' } }, "No tasks yet")),
        tasksByStatus[status].map(function (task, index) { return (React.createElement(react_beautiful_dnd_1.Draggable, { key: task.id, draggableId: task.id, index: index }, function (dragProvided, dragSnapshot) {
            var isEntering = Boolean(enteringTaskIds[task.id]);
            var dragStyle = (dragProvided.draggableProps.style || {});
            var baseTransform = typeof dragStyle.transform === 'string' ? dragStyle.transform : '';
            var transform = baseTransform;
            if (dragSnapshot.isDragging) {
                transform = "".concat(baseTransform, " rotate(2deg) scale(1.03)");
            }
            else if (hoveredTaskId === task.id) {
                transform = 'scale(1.01)';
            }
            else if (isEntering) {
                transform = 'scale(0.97) translateY(6px)';
            }
            var assigneeName = task.assignedTo || 'Unassigned';
            return (React.createElement("div", tslib_1.__assign({ ref: dragProvided.innerRef }, dragProvided.draggableProps, dragProvided.dragHandleProps, { onClick: function () { return onTaskClick(task.id); }, onMouseEnter: function () { return setHoveredTaskId(task.id); }, onMouseLeave: function () { return setHoveredTaskId(null); }, style: tslib_1.__assign({ backgroundColor: '#1f2a44', borderRadius: '10px', padding: '14px', borderLeft: "4px solid ".concat(getStatusColor(status)), border: '1px solid rgba(148, 163, 184, 0.25)', color: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer', backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))', transform: transform || 'scale(1)', opacity: isEntering ? 0 : 1, boxShadow: dragSnapshot.isDragging || hoveredTaskId === task.id
                        ? '0 10px 20px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(59, 130, 246, 0.2)'
                        : '0 2px 6px rgba(0, 0, 0, 0.2)', transition: "".concat(typeof dragStyle.transition === 'string' ? dragStyle.transition : 'transform 180ms ease', ", box-shadow 160ms ease, opacity 180ms ease") }, dragStyle) }),
                React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' } },
                    React.createElement("div", { style: { fontWeight: 700 } }, task.title),
                    React.createElement("span", { style: {
                            backgroundColor: getStatusColor(status),
                            color: '#f8fafc',
                            borderRadius: '999px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 600
                        } }, status)),
                React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '12px' } },
                    React.createElement("div", { style: {
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: getAvatarColor(assigneeName),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#e2e8f0',
                            fontWeight: 600
                        } }, getInitials(assigneeName)),
                    React.createElement("span", null, task.assignedTo || 'Unassigned')),
                React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' } },
                    React.createElement("span", { style: { color: '#94a3b8' } },
                        "\uD83D\uDCC5 ",
                        task.dueDate || 'No date'),
                    React.createElement("span", { style: {
                            backgroundColor: getPriorityColor(task.priority),
                            color: '#0f172a',
                            borderRadius: '999px',
                            padding: '2px 8px',
                            fontWeight: 600
                        } }, task.priority))));
        })); }),
        dropProvided.placeholder)); })); }))));
;
exports.default = BoardView;
//# sourceMappingURL=BoardView.js.map