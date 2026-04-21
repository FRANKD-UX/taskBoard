"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
// BoardView.tsx
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var react_beautiful_dnd_1 = require("react-beautiful-dnd");
var theme_1 = require("./theme");
var boardStyle = {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    padding: '12px 8px 16px 8px',
    scrollBehavior: 'smooth',
    backgroundColor: theme_1.THEME.colors.background,
    // Ensure the board is the positioning reference for the drag preview
    position: 'relative',
};
var columnStyle = {
    width: 'clamp(248px, 24vw, 320px)',
    flex: '1 1 clamp(248px, 24vw, 320px)',
    minWidth: '248px',
    maxWidth: '320px',
    flexShrink: 0,
};
var getInitials = function (name) {
    return name
        .split(' ')
        .filter(function (p) { return p.length > 0; })
        .slice(0, 2)
        .map(function (p) { return p[0].toUpperCase(); })
        .join('');
};
var AVATAR_PALETTE = ['#2563eb', '#7c3aed', '#0ea5e9', '#f59e0b', '#22c55e', '#ec4899', '#14b8a6'];
var getAvatarColor = function (name) {
    if (!name)
        return '#64748b';
    var hash = name.split('').reduce(function (acc, c) { return acc + c.charCodeAt(0); }, 0);
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};
var getPriorityColor = function (priority) {
    return theme_1.THEME.priorityColors[priority] || '#6b7280';
};
var getStatusColor = function (status) {
    return theme_1.THEME.statusColors[status] || '#6b7280';
};
var formatDisplayDate = function (value) {
    if (!value)
        return 'No date';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value))
        return value;
    var match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match)
        return match[1];
    var parsed = new Date(value);
    return isNaN(parsed.getTime()) ? 'No date' : parsed.toISOString().split('T')[0];
};
var groupTasksByStatus = function (tasks, statuses) {
    var grouped = statuses.reduce(function (acc, s) {
        acc[s] = [];
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
    var tasks = _a.tasks, statuses = _a.statuses, onTaskClick = _a.onTaskClick, onNewTask = _a.onNewTask;
    var tasksByStatus = groupTasksByStatus(tasks, statuses);
    var _b = (0, react_1.useState)(null), hoveredTaskId = _b[0], setHoveredTaskId = _b[1];
    var _c = (0, react_1.useState)(null), hoveredColumn = _c[0], setHoveredColumn = _c[1];
    var _d = (0, react_1.useState)({}), enteringTaskIds = _d[0], setEnteringTaskIds = _d[1];
    (0, react_1.useEffect)(function () {
        if (Object.keys(enteringTaskIds).length === 0)
            return;
        var frame = requestAnimationFrame(function () { return setEnteringTaskIds({}); });
        return function () { return cancelAnimationFrame(frame); };
    }, [enteringTaskIds]);
    return (React.createElement("div", { style: { width: '100%', backgroundColor: theme_1.THEME.colors.background } },
        React.createElement("div", { style: boardStyle }, statuses.map(function (status) { return (React.createElement(react_beautiful_dnd_1.Droppable, { key: status, droppableId: status }, function (dropProvided, dropSnapshot) {
            // Remove transition during drag to prevent column shifting
            var columnTransition = dropSnapshot.isDraggingOver
                ? 'none'
                : 'background-color 160ms ease, box-shadow 160ms ease';
            var isEmpty = tasksByStatus[status].length === 0;
            return (React.createElement("div", tslib_1.__assign({ ref: dropProvided.innerRef }, dropProvided.droppableProps, { onMouseEnter: function () { return setHoveredColumn(status); }, onMouseLeave: function () { return setHoveredColumn(null); }, style: tslib_1.__assign(tslib_1.__assign({}, columnStyle), { backgroundColor: dropSnapshot.isDraggingOver
                        ? '#e2e8f0'
                        : hoveredColumn === status
                            ? '#f1f5f9'
                            : theme_1.THEME.colors.panel, borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '300px', boxShadow: dropSnapshot.isDraggingOver
                        ? 'inset 0 0 0 1px rgba(59,130,246,0.3)'
                        : '0 1px 3px rgba(0,0,0,0.05)', transition: columnTransition }) }),
                React.createElement("div", { style: {
                        height: '6px',
                        borderRadius: '999px',
                        backgroundColor: getStatusColor(status),
                        marginBottom: '2px',
                    } }),
                React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                    React.createElement("div", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: theme_1.THEME.colors.textPrimary,
                        } },
                        React.createElement("span", { style: {
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: getStatusColor(status),
                                display: 'inline-block',
                            } }),
                        React.createElement("span", null, status)),
                    React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                        React.createElement("span", { style: {
                                color: theme_1.THEME.colors.textPrimary,
                                backgroundColor: theme_1.THEME.colors.panel,
                                border: "1px solid ".concat(theme_1.THEME.colors.border),
                                borderRadius: '999px',
                                padding: '2px 8px',
                                fontSize: '12px',
                            } }, tasksByStatus[status].length),
                        React.createElement("button", { type: "button", onClick: function () { return onNewTask(status); }, "aria-label": "New task in ".concat(status), style: {
                                width: '24px',
                                height: '24px',
                                borderRadius: '999px',
                                border: "1px solid ".concat(theme_1.THEME.colors.border),
                                backgroundColor: theme_1.THEME.colors.panel,
                                color: theme_1.THEME.colors.textPrimary,
                                cursor: 'pointer',
                                lineHeight: 1,
                                fontSize: '16px',
                            } }, "+"))),
                React.createElement("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' } },
                    isEmpty && (React.createElement("div", { style: { color: theme_1.THEME.colors.textSecondary, fontSize: '12px', padding: '8px 2px' } }, "No tasks yet")),
                    tasksByStatus[status].map(function (task, index) { return (React.createElement(react_beautiful_dnd_1.Draggable, { key: task.id, draggableId: task.id, index: index }, function (dragProvided, dragSnapshot) {
                        var isEntering = Boolean(enteringTaskIds[task.id]);
                        var baseStyle = dragProvided.draggableProps.style;
                        // CRITICAL: Force no transition on transform while dragging
                        var dragStyle = dragSnapshot.isDragging
                            ? tslib_1.__assign(tslib_1.__assign({}, baseStyle), { transition: 'none', willChange: 'transform', userSelect: 'none', pointerEvents: 'none', backgroundColor: theme_1.THEME.colors.panel, borderRadius: '10px', padding: '14px', borderLeft: "4px solid ".concat(getStatusColor(status)), border: '1px solid #e2e8f0', color: theme_1.THEME.colors.textPrimary, display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'grabbing', opacity: 1, boxShadow: '0 10px 20px rgba(0,0,0,0.15),0 0 0 1px rgba(59,130,246,0.5)', transform: baseStyle.transform }) : tslib_1.__assign(tslib_1.__assign({}, baseStyle), { backgroundColor: theme_1.THEME.colors.panel, borderRadius: '10px', padding: '14px', borderLeft: "4px solid ".concat(getStatusColor(status)), border: '1px solid #e2e8f0', color: theme_1.THEME.colors.textPrimary, display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'default', opacity: isEntering ? 0 : 1, userSelect: 'none', boxShadow: hoveredTaskId === task.id
                                ? '0 10px 20px rgba(0,0,0,0.1),0 0 0 1px rgba(59,130,246,0.3)'
                                : '0 2px 6px rgba(0,0,0,0.05)', transition: (baseStyle === null || baseStyle === void 0 ? void 0 : baseStyle.transition)
                                ? "".concat(baseStyle.transition, ", box-shadow 160ms ease, opacity 180ms ease")
                                : 'box-shadow 160ms ease, opacity 180ms ease' });
                        var assigneeName = task.assignedTo || 'Unassigned';
                        return (React.createElement("div", tslib_1.__assign({ ref: dragProvided.innerRef }, dragProvided.draggableProps, { style: dragStyle }),
                            React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                                React.createElement("div", tslib_1.__assign({}, dragProvided.dragHandleProps, { style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '20px',
                                        height: '20px',
                                        cursor: 'grab',
                                        color: theme_1.THEME.colors.textSecondary,
                                        fontSize: '16px',
                                        userSelect: 'none',
                                        flexShrink: 0,
                                    }, onMouseDown: function (e) { return e.stopPropagation(); } }), "\u2630"),
                                React.createElement("div", { onClick: function () { return onTaskClick(task); }, onMouseEnter: function () { return setHoveredTaskId(task.id); }, onMouseLeave: function () { return setHoveredTaskId(null); }, style: {
                                        flex: 1,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                    } },
                                    React.createElement("div", { style: { fontWeight: 700 } }, task.title || 'New Task'),
                                    React.createElement("span", { style: {
                                            backgroundColor: getStatusColor(status),
                                            color: '#ffffff',
                                            borderRadius: '999px',
                                            padding: '2px 8px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                        } }, status))),
                            React.createElement("div", { onClick: function () { return onTaskClick(task); }, onMouseEnter: function () { return setHoveredTaskId(task.id); }, onMouseLeave: function () { return setHoveredTaskId(null); }, style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: theme_1.THEME.colors.textPrimary,
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                } },
                                React.createElement("div", { style: {
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: '50%',
                                        backgroundColor: getAvatarColor(assigneeName),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ffffff',
                                        fontWeight: 600,
                                    } }, getInitials(assigneeName)),
                                React.createElement("span", null, assigneeName)),
                            React.createElement("div", { onClick: function () { return onTaskClick(task); }, onMouseEnter: function () { return setHoveredTaskId(task.id); }, onMouseLeave: function () { return setHoveredTaskId(null); }, style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                } },
                                React.createElement("span", { style: { color: theme_1.THEME.colors.textSecondary } }, formatDisplayDate(task.dueDate)),
                                React.createElement("span", { style: {
                                        backgroundColor: getPriorityColor(task.priority),
                                        color: '#0f172a',
                                        borderRadius: '999px',
                                        padding: '2px 8px',
                                        fontWeight: 600,
                                    } }, task.priority))));
                    })); }),
                    React.createElement("div", { style: {
                            display: dropSnapshot.isDraggingOver && isEmpty ? 'block' : 'none',
                            minHeight: '80px',
                            width: '100%',
                        } }, dropProvided.placeholder),
                    !isEmpty && dropProvided.placeholder)));
        })); }))));
};
exports.default = BoardView;
//# sourceMappingURL=BoardView.js.map