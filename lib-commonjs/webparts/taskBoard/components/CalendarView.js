"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
var formatDateKey = function (date) {
    var year = date.getFullYear();
    var month = "".concat(date.getMonth() + 1).padStart(2, '0');
    var day = "".concat(date.getDate()).padStart(2, '0');
    return "".concat(year, "-").concat(month, "-").concat(day);
};
var normalizeTaskDueDateKey = function (value) {
    if (!value) {
        return null;
    }
    var parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return formatDateKey(parsed);
    }
    var dateOnly = value.split('T')[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : null;
};
var CalendarView = function (_a) {
    var tasks = _a.tasks, onTaskClick = _a.onTaskClick;
    var _b = (0, react_1.useState)(null), hoveredTaskId = _b[0], setHoveredTaskId = _b[1];
    var today = new Date();
    var currentYear = today.getFullYear();
    var currentMonth = today.getMonth();
    var todayKey = formatDateKey(today);
    var tasksByDate = (0, react_1.useMemo)(function () {
        return tasks.reduce(function (grouped, task) {
            if (!task.dueDate) {
                return grouped;
            }
            var dueDateKey = normalizeTaskDueDateKey(task.dueDate);
            if (!dueDateKey) {
                return grouped;
            }
            if (!grouped[dueDateKey]) {
                grouped[dueDateKey] = [];
            }
            grouped[dueDateKey].push(task);
            return grouped;
        }, {});
    }, [tasks]);
    var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    var firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    var monthLabel = new Date(currentYear, currentMonth, 1).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric'
    });
    var cells = Array.from({ length: 42 }, function (_, index) {
        var dayNumber = index - firstDayIndex + 1;
        if (dayNumber < 1 || dayNumber > daysInMonth) {
            return null;
        }
        var dateKey = formatDateKey(new Date(currentYear, currentMonth, dayNumber));
        var dayTasks = tasksByDate[dateKey] || [];
        var isToday = dateKey === todayKey;
        return (React.createElement("div", { key: dateKey, style: {
                minHeight: '132px',
                backgroundColor: '#1f2a44',
                border: isToday ? '1px solid #60a5fa' : '1px solid #334155',
                borderRadius: '8px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: isToday ? '0 0 0 1px rgba(96, 165, 250, 0.25)' : 'none'
            } },
            React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                React.createElement("span", { style: { color: '#f8fafc', fontSize: '12px', fontWeight: isToday ? 700 : 600 } }, dayNumber),
                React.createElement("span", { style: {
                        color: '#e2e8f0',
                        backgroundColor: '#334155',
                        borderRadius: '999px',
                        padding: '2px 7px',
                        fontSize: '11px',
                        lineHeight: 1.2
                    } }, dayTasks.length)),
            React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' } }, dayTasks.map(function (task) { return (React.createElement("button", { key: task.id, type: "button", onClick: function () { return onTaskClick(task.id); }, onMouseEnter: function () { return setHoveredTaskId(task.id); }, onMouseLeave: function () { return setHoveredTaskId(null); }, style: {
                    backgroundColor: getStatusColor(task.status),
                    border: 'none',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '11px',
                    textAlign: 'left',
                    padding: '5px 7px',
                    cursor: 'pointer',
                    opacity: hoveredTaskId === task.id ? 1 : 0.92,
                    filter: hoveredTaskId === task.id ? 'brightness(1.08)' : 'none',
                    transition: 'filter 120ms ease, opacity 120ms ease'
                } }, task.title)); }))));
    });
    return (React.createElement("div", { style: { padding: '16px', backgroundColor: '#171c33' } },
        React.createElement("div", { style: { color: '#f8fafc', marginBottom: '12px', fontWeight: 700 } }, monthLabel),
        React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '10px', marginBottom: '10px' } }, weekDays.map(function (day) { return (React.createElement("div", { key: day, style: { color: '#94a3b8', fontSize: '12px', textAlign: 'center', fontWeight: 600 } }, day)); })),
        React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '10px' } }, cells)));
};
exports.default = CalendarView;
//# sourceMappingURL=CalendarView.js.map