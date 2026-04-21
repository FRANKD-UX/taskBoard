"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
// CalendarView.tsx
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var theme_1 = require("./theme");
var weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
var formatDateKey = function (date) {
    var year = date.getFullYear();
    var month = "".concat(date.getMonth() + 1).padStart(2, '0');
    var day = "".concat(date.getDate()).padStart(2, '0');
    return "".concat(year, "-").concat(month, "-").concat(day);
};
var normalizeTaskDueDateKey = function (value) {
    if (!value)
        return null;
    var parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime()))
        return formatDateKey(parsed);
    var dateOnly = value.split('T')[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : null;
};
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
var CalendarView = function (_a) {
    var tasks = _a.tasks, onTaskClick = _a.onTaskClick;
    var _b = (0, react_1.useState)(null), hoveredTaskId = _b[0], setHoveredTaskId = _b[1];
    var today = new Date();
    var currentYear = today.getFullYear();
    var currentMonth = today.getMonth();
    var todayKey = formatDateKey(today);
    var tasksByDate = (0, react_1.useMemo)(function () {
        return tasks.reduce(function (grouped, task) {
            if (!task.dueDate)
                return grouped;
            var dueDateKey = normalizeTaskDueDateKey(task.dueDate);
            if (!dueDateKey)
                return grouped;
            if (!grouped[dueDateKey])
                grouped[dueDateKey] = [];
            grouped[dueDateKey].push(task);
            return grouped;
        }, {});
    }, [tasks]);
    var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    var firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    var monthLabel = new Date(currentYear, currentMonth, 1).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
    });
    var cells = Array.from({ length: 42 }, function (_, index) {
        var dayNumber = index - firstDayIndex + 1;
        if (dayNumber < 1 || dayNumber > daysInMonth)
            return null;
        var dateKey = formatDateKey(new Date(currentYear, currentMonth, dayNumber));
        var dayTasks = tasksByDate[dateKey] || [];
        var isToday = dateKey === todayKey;
        return (React.createElement("div", { key: dateKey, style: {
                minHeight: '132px',
                backgroundColor: isToday ? theme_1.THEME.colors.primarySoft : theme_1.THEME.colors.panel,
                border: isToday ? "1px solid ".concat(theme_1.THEME.colors.primary) : "1px solid ".concat(theme_1.THEME.colors.border),
                borderRadius: '8px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: isToday ? "0 0 0 1px ".concat(theme_1.THEME.colors.primary, "40") : 'none',
            } },
            React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                React.createElement("span", { style: {
                        color: isToday ? theme_1.THEME.colors.primary : theme_1.THEME.colors.textStrong,
                        fontSize: '12px',
                        fontWeight: isToday ? 700 : 600,
                    } }, dayNumber),
                React.createElement("span", { style: {
                        color: theme_1.THEME.colors.textSecondary,
                        backgroundColor: theme_1.THEME.colors.background,
                        border: "1px solid ".concat(theme_1.THEME.colors.border),
                        borderRadius: '999px',
                        padding: '2px 7px',
                        fontSize: '11px',
                        lineHeight: 1.2,
                    } }, dayTasks.length)),
            React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px' } }, dayTasks.map(function (task) {
                var _a;
                return (React.createElement("button", { key: task.id, type: "button", onClick: function () { return onTaskClick(task.id); }, onMouseEnter: function () { return setHoveredTaskId(task.id); }, onMouseLeave: function () { return setHoveredTaskId(null); }, style: {
                        backgroundColor: (_a = theme_1.THEME.statusColors[task.status]) !== null && _a !== void 0 ? _a : theme_1.THEME.statusColors.Unassigned,
                        border: 'none',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '11px',
                        textAlign: 'left',
                        padding: '5px 7px',
                        cursor: 'pointer',
                        opacity: hoveredTaskId === task.id ? 1 : 0.88,
                        filter: hoveredTaskId === task.id ? 'brightness(1.08)' : 'none',
                        transition: 'filter 120ms ease, opacity 120ms ease',
                    } }, task.title));
            }))));
    });
    return (React.createElement("div", { style: { padding: '16px', backgroundColor: theme_1.THEME.colors.background } },
        React.createElement("div", { style: { color: theme_1.THEME.colors.textStrong, marginBottom: '12px', fontWeight: 700 } }, monthLabel),
        React.createElement("div", { style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                gap: '10px',
                marginBottom: '10px',
            } }, weekDays.map(function (day) { return (React.createElement("div", { key: day, style: {
                color: theme_1.THEME.colors.textSecondary,
                fontSize: '12px',
                textAlign: 'center',
                fontWeight: 600,
            } }, day)); })),
        React.createElement("div", { style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                gap: '10px',
            } }, cells)));
};
exports.default = CalendarView;
//# sourceMappingURL=CalendarView.js.map