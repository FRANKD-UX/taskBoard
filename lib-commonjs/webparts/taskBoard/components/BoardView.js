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
    position: 'relative',
};
var columnStyle = {
    width: 'clamp(248px, 24vw, 320px)',
    flex: '1 1 clamp(248px, 24vw, 320px)',
    minWidth: '248px',
    maxWidth: '320px',
    flexShrink: 0,
};
var AVATAR_PALETTE = ['#2563eb', '#7c3aed', '#0ea5e9', '#f59e0b', '#22c55e', '#ec4899', '#14b8a6'];
var getInitials = function (name) {
    return name
        .split(' ')
        .filter(function (part) { return part.length > 0; })
        .slice(0, 2)
        .map(function (part) { return part[0].toUpperCase(); })
        .join('');
};
var getAvatarColor = function (name) {
    if (!name)
        return '#64748b';
    var hash = name.split('').reduce(function (acc, char) { return acc + char.charCodeAt(0); }, 0);
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};
var getPriorityColor = function (priority) {
    return theme_1.THEME.priorityColors[priority] || '#6b7280';
};
var getStatusColor = function (status) {
    return theme_1.THEME.statusColors[status] || '#6b7280';
};
var getSeverityColor = function (severity) {
    if (!severity)
        return theme_1.THEME.colors.border;
    return theme_1.THEME.severityColors[severity];
};
var getSlaLabel = function (severity) {
    if (severity === 'P1')
        return '🔥 Critical';
    if (severity === 'P2')
        return '⚠ High';
    return null;
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
// ──────────────────────────────────────────────
// SLA helpers
// ──────────────────────────────────────────────
var AT_RISK_REMAINING_HOURS = 1; // change to adjust when "AtRisk" appears
var getSlaStatusColor = function (status) {
    switch (status) {
        case 'OnTrack': return '#22c55e';
        case 'AtRisk': return '#f59e0b';
        case 'Breached': return '#ef4444';
        case 'Resolved': return '#3b82f6';
        default: return '#6b7280';
    }
};
/**
 * Returns the live SLA status based on the resolution deadline.
 * Falls back to the stored slaStatus from SharePoint if dates are missing.
 */
var computeSlaStatus = function (resolutionDueDate, storedSlaStatus) {
    // If we have a resolution due date, calculate live status
    if (resolutionDueDate) {
        var deadline = new Date(resolutionDueDate).getTime();
        if (isNaN(deadline))
            return storedSlaStatus;
        var now = Date.now();
        if (now > deadline)
            return 'Breached';
        var remainingMs = deadline - now;
        if (remainingMs <= AT_RISK_REMAINING_HOURS * 60 * 60 * 1000)
            return 'AtRisk';
        return 'OnTrack';
    }
    // No due date – fall back to SP stored value
    return storedSlaStatus;
};
/**
 * Formats a time-in-milliseconds into a human-readable countdown string.
 * e.g. "2h 15m", "45m", "10s"
 */
var formatCountdown = function (ms) {
    if (ms <= 0)
        return 'Overdue';
    var totalSeconds = Math.floor(ms / 1000);
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    if (hours > 0)
        return "".concat(hours, "h ").concat(minutes, "m");
    if (minutes > 0)
        return "".concat(minutes, "m ").concat(seconds, "s");
    return "".concat(seconds, "s");
};
/**
 * Resolves the remaining time until the resolution deadline.
 * Returns the countdown string, or null if no resolutionDueDate.
 */
var getRemainingTime = function (resolutionDueDate) {
    if (!resolutionDueDate)
        return null;
    var deadline = new Date(resolutionDueDate).getTime();
    if (isNaN(deadline))
        return null;
    var now = Date.now();
    var diff = deadline - now;
    return formatCountdown(diff);
};
var formatResolutionHours = function (minutes) {
    if (minutes === undefined || minutes === null || minutes <= 0)
        return null;
    var hours = minutes / 60;
    var display = hours % 1 === 0 ? hours.toString() : hours.toFixed(1);
    return "".concat(display, "h");
};
// ──────────────────────────────────────────────
// Grouping logic
// ──────────────────────────────────────────────
var groupTasksByStatus = function (tasks, statuses) {
    var grouped = statuses.reduce(function (acc, status) {
        acc[status] = [];
        return acc;
    }, {});
    tasks.forEach(function (task) {
        if (statuses.indexOf(task.status) > -1) {
            grouped[task.status].push(task);
        }
        else if (statuses.length > 0) {
            grouped[statuses[0]].push(task);
        }
    });
    return grouped;
};
// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
var BoardView = function (_a) {
    var tasks = _a.tasks, statuses = _a.statuses, type = _a.type, onTaskClick = _a.onTaskClick, onNewTask = _a.onNewTask;
    var tasksByStatus = groupTasksByStatus(tasks, statuses);
    var _b = (0, react_1.useState)(null), hoveredTaskId = _b[0], setHoveredTaskId = _b[1];
    var _c = (0, react_1.useState)(null), hoveredColumn = _c[0], setHoveredColumn = _c[1];
    var _d = (0, react_1.useState)({}), enteringTaskIds = _d[0], setEnteringTaskIds = _d[1];
    // Tick state for re-rendering every second (drives countdown updates)
    var _e = (0, react_1.useState)(0), setTick = _e[1];
    (0, react_1.useEffect)(function () {
        var interval = setInterval(function () { return setTick(function (t) { return t + 1; }); }, 1000);
        return function () { return clearInterval(interval); };
    }, []);
    (0, react_1.useEffect)(function () {
        if (Object.keys(enteringTaskIds).length === 0)
            return;
        var frame = requestAnimationFrame(function () { return setEnteringTaskIds({}); });
        return function () { return cancelAnimationFrame(frame); };
    }, [enteringTaskIds]);
    return (React.createElement("div", { style: { width: '100%', backgroundColor: theme_1.THEME.colors.background } },
        React.createElement("div", { style: boardStyle }, statuses.map(function (status) { return (React.createElement(react_beautiful_dnd_1.Droppable, { key: status, droppableId: status }, function (dropProvided, dropSnapshot) {
            var columnTransition = dropSnapshot.isDraggingOver
                ? 'none'
                : 'background-color 160ms ease, box-shadow 160ms ease';
            var isEmpty = (tasksByStatus[status] || []).length === 0;
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
                            } }, (tasksByStatus[status] || []).length),
                        React.createElement("button", { type: "button", onClick: function () { return onNewTask(status, type); }, "aria-label": "New ".concat(type, " in ").concat(status), style: {
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
                    isEmpty && (React.createElement("div", { style: { color: theme_1.THEME.colors.textSecondary, fontSize: '12px', padding: '8px 2px' } },
                        "No ",
                        type === 'incident' ? 'incidents' : 'tasks',
                        " yet")),
                    (tasksByStatus[status] || []).map(function (task, index) { return (React.createElement(react_beautiful_dnd_1.Draggable, { key: task.id, draggableId: task.id, index: index }, function (dragProvided, dragSnapshot) {
                        var isEntering = Boolean(enteringTaskIds[task.id]);
                        var baseStyle = dragProvided.draggableProps.style;
                        var assigneeName = task.assignedTo || 'Unassigned';
                        var slaLabel = getSlaLabel(task.severity);
                        var resolutionHours = formatResolutionHours(task.slaResolutionMinutes);
                        // Live SLA status
                        var liveStatus = computeSlaStatus(task.resolutionDueDate, task.slaStatus);
                        var remainingTime = getRemainingTime(task.resolutionDueDate);
                        var dragStyle = dragSnapshot.isDragging
                            ? tslib_1.__assign(tslib_1.__assign({}, baseStyle), { transition: 'none', willChange: 'transform', userSelect: 'none', pointerEvents: 'none', backgroundColor: theme_1.THEME.colors.panel, borderRadius: '10px', padding: '14px', borderLeft: "4px solid ".concat(getStatusColor(status)), border: '1px solid #e2e8f0', color: theme_1.THEME.colors.textPrimary, display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'grabbing', opacity: 1, boxShadow: '0 10px 20px rgba(0,0,0,0.15),0 0 0 1px rgba(59,130,246,0.5)', transform: baseStyle.transform }) : tslib_1.__assign(tslib_1.__assign({}, baseStyle), { backgroundColor: theme_1.THEME.colors.panel, borderRadius: '10px', padding: '14px', borderLeft: "4px solid ".concat(type === 'incident' ? getSeverityColor(task.severity) : getStatusColor(status)), border: '1px solid #e2e8f0', color: theme_1.THEME.colors.textPrimary, display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'default', opacity: isEntering ? 0 : 1, userSelect: 'none', boxShadow: hoveredTaskId === task.id
                                ? '0 10px 20px rgba(0,0,0,0.1),0 0 0 1px rgba(59,130,246,0.3)'
                                : '0 2px 6px rgba(0,0,0,0.05)', transition: (baseStyle === null || baseStyle === void 0 ? void 0 : baseStyle.transition)
                                ? "".concat(baseStyle.transition, ", box-shadow 160ms ease, opacity 180ms ease")
                                : 'box-shadow 160ms ease, opacity 180ms ease' });
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
                                    }, onMouseDown: function (event) { return event.stopPropagation(); } }), ":::"),
                                React.createElement("div", { onClick: function () { return onTaskClick(task); }, onMouseEnter: function () { return setHoveredTaskId(task.id); }, onMouseLeave: function () { return setHoveredTaskId(null); }, style: {
                                        flex: 1,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                    } },
                                    React.createElement("div", { style: { fontWeight: 700 } }, task.title || 'New Item'),
                                    React.createElement("span", { style: {
                                            backgroundColor: type === 'incident'
                                                ? getSeverityColor(task.severity)
                                                : getStatusColor(status),
                                            color: '#ffffff',
                                            borderRadius: '999px',
                                            padding: '2px 8px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                        } }, type === 'incident' ? (task.severity || 'P4') : status))),
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
                            type === 'incident' ? (React.createElement("div", { onClick: function () { return onTaskClick(task); }, onMouseEnter: function () { return setHoveredTaskId(task.id); }, onMouseLeave: function () { return setHoveredTaskId(null); }, style: {
                                    display: 'grid',
                                    gap: '8px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                } },
                                React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' } },
                                    React.createElement("span", { style: { color: theme_1.THEME.colors.textSecondary } }, task.affectedService || 'Service not set'),
                                    slaLabel && (React.createElement("span", { style: {
                                            color: theme_1.THEME.colors.textStrong,
                                            fontWeight: 700,
                                            fontSize: '11px',
                                        } }, slaLabel))),
                                React.createElement("span", { style: {
                                        backgroundColor: '#f8fafc',
                                        color: theme_1.THEME.colors.textPrimary,
                                        borderRadius: '8px',
                                        padding: '8px 10px',
                                        border: "1px solid ".concat(theme_1.THEME.colors.border),
                                    } }, task.impact || 'Impact details pending'),
                                (liveStatus || resolutionHours || remainingTime) && (React.createElement("div", { style: {
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '4px',
                                    } },
                                    liveStatus && (React.createElement("span", { style: {
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            color: '#ffffff',
                                            backgroundColor: getSlaStatusColor(liveStatus),
                                            borderRadius: '999px',
                                            padding: '1px 8px',
                                        } }, liveStatus)),
                                    React.createElement("div", { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                                        remainingTime && (React.createElement("span", { style: {
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: theme_1.THEME.colors.textSecondary,
                                            } },
                                            "\u23F3 ",
                                            remainingTime)),
                                        resolutionHours && (React.createElement("span", { style: {
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: theme_1.THEME.colors.textSecondary,
                                            } },
                                            "\u23F1 ",
                                            resolutionHours))))))) : (React.createElement("div", { onClick: function () { return onTaskClick(task); }, onMouseEnter: function () { return setHoveredTaskId(task.id); }, onMouseLeave: function () { return setHoveredTaskId(null); }, style: {
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
                                    } }, task.priority)))));
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