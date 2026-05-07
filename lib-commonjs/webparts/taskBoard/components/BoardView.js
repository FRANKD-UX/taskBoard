"use strict";
// BoardView.tsx
//
// MIGRATION NOTES (react-beautiful-dnd -> dnd-kit):
//
//   1. DragDropContext   -> DndContext         (top-level drag orchestrator)
//   2. Droppable         -> useDroppable       (column drop zones)
//   3. Draggable         -> useDraggable       (individual task cards)
//   4. ReactDOM.createPortal workaround REMOVED – dnd-kit does not fight
//      SharePoint's scroll containers so the portal hack is no longer needed.
//   5. isDragging state  -> activeId state     (tracked at DndContext level,
//      passed down via prop so each card knows whether IT is being dragged)
//   6. onDragEnd         -> handleDragEnd      (same optimistic-update pattern,
//      new event shape: { active, over } instead of result.draggableId etc.)
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var core_1 = require("@dnd-kit/core");
var core_2 = require("@dnd-kit/core");
var core_3 = require("@dnd-kit/core");
var theme_1 = require("./theme");
// ---------- STYLES ----------
var boardOuterStyle = {
    height: 'calc(100vh - 200px)',
    overflow: 'hidden',
    backgroundColor: theme_1.THEME.colors.background,
    display: 'flex',
    flexDirection: 'column',
};
var boardColumnsRowStyle = {
    display: 'flex',
    gap: '16px',
    padding: '12px 8px 16px 8px',
    height: '100%',
    overflow: 'hidden',
};
var columnBaseStyle = {
    flex: '1 1 0',
    minWidth: '200px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    borderRadius: '12px',
    padding: '12px',
    backgroundColor: theme_1.THEME.colors.panel,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    boxSizing: 'border-box',
};
// ---------- AVATAR / COLOR HELPERS ----------
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
        return 'Critical';
    if (severity === 'P2')
        return 'High';
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
// ---------- SLA HELPERS ----------
var AT_RISK_REMAINING_HOURS = 1;
var getSlaStatusColor = function (status) {
    switch (status) {
        case 'OnTrack': return '#22c55e';
        case 'AtRisk': return '#f59e0b';
        case 'Breached': return '#ef4444';
        case 'Resolved': return '#3b82f6';
        default: return '#6b7280';
    }
};
var computeSlaStatus = function (resolutionDueDate, storedSlaStatus) {
    if (resolutionDueDate) {
        var deadline = new Date(resolutionDueDate).getTime();
        if (isNaN(deadline))
            return storedSlaStatus;
        var now = Date.now();
        if (now > deadline)
            return 'Breached';
        if (deadline - now <= AT_RISK_REMAINING_HOURS * 60 * 60 * 1000)
            return 'AtRisk';
        return 'OnTrack';
    }
    return storedSlaStatus;
};
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
var getRemainingTime = function (resolutionDueDate) {
    if (!resolutionDueDate)
        return null;
    var deadline = new Date(resolutionDueDate).getTime();
    if (isNaN(deadline))
        return null;
    return formatCountdown(deadline - Date.now());
};
var formatResolutionHours = function (minutes) {
    if (minutes === undefined || minutes === null || minutes <= 0)
        return null;
    var hours = minutes / 60;
    var display = hours % 1 === 0 ? hours.toString() : hours.toFixed(1);
    return "".concat(display, "h");
};
// ---------- GROUPING LOGIC ----------
var groupTasksByStatus = function (tasks, statuses) {
    // Pre-populate every status bucket so empty columns still render
    var grouped = statuses.reduce(function (acc, status) {
        acc[status] = [];
        return acc;
    }, {});
    tasks.forEach(function (task) {
        if (statuses.indexOf(task.status) > -1) {
            grouped[task.status].push(task);
        }
        else if (statuses.length > 0) {
            // Fallback: orphaned tasks land in the first column
            grouped[statuses[0]].push(task);
        }
    });
    return grouped;
};
var DroppableColumn = function (_a) {
    var status = _a.status, type = _a.type, tasks = _a.tasks, activeTaskId = _a.activeTaskId, hoveredColumn = _a.hoveredColumn, hoveredTaskId = _a.hoveredTaskId, onNewTask = _a.onNewTask, onTaskClick = _a.onTaskClick, onColumnHover = _a.onColumnHover, onTaskHover = _a.onTaskHover;
    var _b = (0, core_3.useDroppable)({ id: status }), setNodeRef = _b.setNodeRef, isOver = _b.isOver;
    var isEmpty = tasks.length === 0;
    var columnStyle = tslib_1.__assign(tslib_1.__assign({}, columnBaseStyle), { backgroundColor: isOver
            ? '#e2e8f0'
            : hoveredColumn === status
                ? '#f1f5f9'
                : theme_1.THEME.colors.panel, boxShadow: isOver
            ? 'inset 0 0 0 1px rgba(59,130,246,0.3)'
            : '0 1px 3px rgba(0,0,0,0.05)', transition: isOver
            ? 'none'
            : 'background-color 160ms ease, box-shadow 160ms ease' });
    return (React.createElement("div", { ref: setNodeRef, style: columnStyle, onMouseEnter: function () { return onColumnHover(status); }, onMouseLeave: function () { return onColumnHover(null); } },
        React.createElement("div", { style: {
                height: '6px',
                borderRadius: '999px',
                backgroundColor: getStatusColor(status),
                marginBottom: '2px',
            } }),
        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', color: theme_1.THEME.colors.textPrimary } },
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
                    } }, tasks.length),
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
            isEmpty && (React.createElement("div", { style: {
                    color: theme_1.THEME.colors.textSecondary,
                    fontSize: '12px',
                    padding: '8px 2px',
                } },
                "No ",
                type === 'incident' ? 'incidents' : 'tasks',
                " yet")),
            tasks.map(function (task) { return (React.createElement(DraggableCard, { key: task.id, task: task, type: type, status: status, isBeingDragged: activeTaskId === task.id, isHovered: hoveredTaskId === task.id, onTaskClick: onTaskClick, onTaskHover: onTaskHover })); }))));
};
var DraggableCard = function (_a) {
    var task = _a.task, type = _a.type, status = _a.status, isBeingDragged = _a.isBeingDragged, isHovered = _a.isHovered, onTaskClick = _a.onTaskClick, onTaskHover = _a.onTaskHover;
    var _b = (0, core_2.useDraggable)({ id: task.id }), attributes = _b.attributes, listeners = _b.listeners, setNodeRef = _b.setNodeRef, transform = _b.transform;
    var assigneeName = task.assignedTo || 'Unassigned';
    var slaLabel = getSlaLabel(task.severity);
    var resolutionHours = formatResolutionHours(task.slaResolutionMinutes);
    var liveStatus = computeSlaStatus(task.resolutionDueDate, task.slaStatus);
    var remainingTime = getRemainingTime(task.resolutionDueDate);
    // While dragging, we offset the card visually but leave its DOM slot in place.
    // This avoids the "card disappears" bug from react-beautiful-dnd fighting the
    // SharePoint scroll container.
    var draggingStyle = {
        position: 'relative',
        zIndex: 9999,
        transform: transform ? "translate(".concat(transform.x, "px, ").concat(transform.y, "px)") : undefined,
        willChange: 'transform',
        userSelect: 'none',
        pointerEvents: 'none',
        backgroundColor: theme_1.THEME.colors.panel,
        borderRadius: '10px',
        padding: '14px',
        borderLeft: "4px solid ".concat(getStatusColor(status)),
        border: '1px solid #e2e8f0',
        color: theme_1.THEME.colors.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        cursor: 'grabbing',
        opacity: 1,
        boxShadow: '0 10px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(59,130,246,0.5)',
    };
    var idleStyle = {
        backgroundColor: theme_1.THEME.colors.panel,
        borderRadius: '10px',
        padding: '14px',
        borderLeft: "4px solid ".concat(type === 'incident' ? getSeverityColor(task.severity) : getStatusColor(status)),
        border: '1px solid #e2e8f0',
        color: theme_1.THEME.colors.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        cursor: 'default',
        opacity: 1,
        userSelect: 'none',
        boxShadow: isHovered
            ? '0 10px 20px rgba(0,0,0,0.1), 0 0 0 1px rgba(59,130,246,0.3)'
            : '0 2px 6px rgba(0,0,0,0.05)',
        transition: 'box-shadow 160ms ease',
    };
    return (React.createElement("div", { ref: setNodeRef, style: isBeingDragged ? draggingStyle : idleStyle },
        React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            React.createElement("div", tslib_1.__assign({}, listeners, attributes, { style: {
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
                }, onMouseDown: function (e) { return e.stopPropagation(); } }), ":::"),
            React.createElement("div", { onClick: function () { return onTaskClick(task); }, onMouseEnter: function () { return onTaskHover(task.id); }, onMouseLeave: function () { return onTaskHover(null); }, style: {
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
        React.createElement("div", { onClick: function () { return onTaskClick(task); }, onMouseEnter: function () { return onTaskHover(task.id); }, onMouseLeave: function () { return onTaskHover(null); }, style: {
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
        type === 'incident' ? (React.createElement("div", { onClick: function () { return onTaskClick(task); }, onMouseEnter: function () { return onTaskHover(task.id); }, onMouseLeave: function () { return onTaskHover(null); }, style: { display: 'grid', gap: '8px', fontSize: '12px', cursor: 'pointer' } },
            React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' } },
                React.createElement("span", { style: { color: theme_1.THEME.colors.textSecondary } }, task.affectedService || 'Service not set'),
                slaLabel && (React.createElement("span", { style: { color: theme_1.THEME.colors.textStrong, fontWeight: 700, fontSize: '11px' } }, slaLabel))),
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
                    remainingTime && (React.createElement("span", { style: { fontSize: '11px', fontWeight: 600, color: theme_1.THEME.colors.textSecondary } }, remainingTime)),
                    resolutionHours && (React.createElement("span", { style: { fontSize: '11px', fontWeight: 600, color: theme_1.THEME.colors.textSecondary } }, resolutionHours))))))) : (
        // Task footer: due date + priority badge
        React.createElement("div", { onClick: function () { return onTaskClick(task); }, onMouseEnter: function () { return onTaskHover(task.id); }, onMouseLeave: function () { return onTaskHover(null); }, style: {
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
};
// ---------- ROOT COMPONENT ----------
var BoardView = function (_a) {
    var tasks = _a.tasks, statuses = _a.statuses, type = _a.type, onTaskClick = _a.onTaskClick, onNewTask = _a.onNewTask, onTaskStatusChange = _a.onTaskStatusChange;
    // activeTaskId tracks which card is currently being dragged.
    // We pass it down so DraggableCard can apply the lifted style to itself.
    var _b = (0, react_1.useState)(null), activeTaskId = _b[0], setActiveTaskId = _b[1];
    var _c = (0, react_1.useState)(null), hoveredTaskId = _c[0], setHoveredTaskId = _c[1];
    var _d = (0, react_1.useState)(null), hoveredColumn = _d[0], setHoveredColumn = _d[1];
    // Re-render every second to keep SLA countdowns accurate.
    var _e = (0, react_1.useState)(0), setTick = _e[1];
    (0, react_1.useEffect)(function () {
        var interval = setInterval(function () { return setTick(function (t) { return t + 1; }); }, 1000);
        return function () { return clearInterval(interval); };
    }, []);
    // Group the incoming task list into per-status buckets.
    // We do this inside the render so it always reflects the latest props.
    var tasksByStatus = groupTasksByStatus(tasks, statuses);
    // PointerSensor is the standard mouse/touch sensor for dnd-kit.
    // activationConstraint delays activation by 8px so that normal clicks
    // are not accidentally treated as drags.
    var sensors = (0, core_1.useSensors)((0, core_1.useSensor)(core_1.PointerSensor, {
        activationConstraint: { distance: 8 },
    }));
    var handleDragStart = function (event) {
        setActiveTaskId(event.active.id);
    };
    var handleDragEnd = function (event) {
        var active = event.active, over = event.over;
        setActiveTaskId(null);
        // If dropped outside any column, do nothing.
        if (!over)
            return;
        var taskId = active.id;
        var newStatus = over.id;
        // Find the task that was dragged to check its current status.
        var draggedTask = tasks.find(function (t) { return t.id === taskId; });
        if (!draggedTask)
            return;
        // Skip if dropped back into the same column – no change needed.
        if (draggedTask.status === newStatus)
            return;
        // The parent owns state and persistence (TaskService).
        // We call the callback and let the parent do the optimistic update + API call.
        onTaskStatusChange(taskId, newStatus);
    };
    return (
    /*
        DndContext is the drag orchestrator – it replaces DragDropContext.
        collisionDetection: closestCenter means dnd-kit picks the droppable
        whose centre point is closest to the dragged item's centre.
        That is the correct algorithm for a column-based Kanban board.
    */
    React.createElement(core_1.DndContext, { sensors: sensors, collisionDetection: core_1.closestCenter, onDragStart: handleDragStart, onDragEnd: handleDragEnd },
        React.createElement("div", { style: boardOuterStyle },
            React.createElement("div", { style: boardColumnsRowStyle }, statuses.map(function (status) { return (React.createElement(DroppableColumn, { key: status, status: status, type: type, tasks: tasksByStatus[status] || [], activeTaskId: activeTaskId, hoveredColumn: hoveredColumn, hoveredTaskId: hoveredTaskId, onNewTask: onNewTask, onTaskClick: onTaskClick, onColumnHover: setHoveredColumn, onTaskHover: setHoveredTaskId })); })))));
};
exports.default = BoardView;
//# sourceMappingURL=BoardView.js.map