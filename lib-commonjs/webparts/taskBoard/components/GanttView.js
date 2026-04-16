"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var DAY_IN_MS = 24 * 60 * 60 * 1000;
var toUtcStartOfDay = function (value) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
};
var parseDate = function (value) {
    if (!value) {
        return null;
    }
    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return toUtcStartOfDay(parsed);
};
var formatLabel = function (value) {
    return value.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
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
var GanttView = function (_a) {
    var tasks = _a.tasks, statuses = _a.statuses, onTaskClick = _a.onTaskClick;
    var _b = (0, react_1.useState)(null), hoveredTaskId = _b[0], setHoveredTaskId = _b[1];
    var timelineTasks = (0, react_1.useMemo)(function () {
        return tasks
            .map(function (task) {
            var end = parseDate(task.dueDate);
            if (!end) {
                return null;
            }
            var status = statuses.indexOf(task.status) > -1 ? task.status : 'Unassigned';
            var start = parseDate(task.createdAt) || new Date(end.getTime() - 3 * DAY_IN_MS);
            return {
                task: task,
                status: status,
                start: start <= end ? start : end,
                end: end
            };
        })
            .filter(function (item) { return item !== null; });
    }, [statuses, tasks]);
    var groupedByStatus = (0, react_1.useMemo)(function () {
        var grouped = statuses.reduce(function (acc, status) {
            acc[status] = [];
            return acc;
        }, {});
        timelineTasks.forEach(function (item) {
            grouped[item.status].push(item);
        });
        return grouped;
    }, [statuses, timelineTasks]);
    var timelineRange = (0, react_1.useMemo)(function () {
        if (timelineTasks.length === 0) {
            var today = toUtcStartOfDay(new Date());
            return {
                minDate: today,
                maxDate: new Date(today.getTime() + 14 * DAY_IN_MS)
            };
        }
        var min = timelineTasks[0].start;
        var max = timelineTasks[0].end;
        timelineTasks.forEach(function (item) {
            if (item.start < min) {
                min = item.start;
            }
            if (item.end > max) {
                max = item.end;
            }
        });
        return {
            minDate: min,
            maxDate: max
        };
    }, [timelineTasks]);
    var totalDays = Math.max(1, Math.round((timelineRange.maxDate.getTime() - timelineRange.minDate.getTime()) / DAY_IN_MS) + 1);
    var ticks = (0, react_1.useMemo)(function () {
        var points = [];
        var step = Math.max(1, Math.ceil(totalDays / 8));
        for (var index = 0; index < totalDays; index += step) {
            points.push(new Date(timelineRange.minDate.getTime() + index * DAY_IN_MS));
        }
        if (points.length === 0 || points[points.length - 1].getTime() !== timelineRange.maxDate.getTime()) {
            points.push(timelineRange.maxDate);
        }
        return points;
    }, [timelineRange.maxDate, timelineRange.minDate, totalDays]);
    var getTaskBarStyle = function (item) {
        var startOffsetDays = Math.round((item.start.getTime() - timelineRange.minDate.getTime()) / DAY_IN_MS);
        var durationDays = Math.max(1, Math.round((item.end.getTime() - item.start.getTime()) / DAY_IN_MS) + 1);
        var isHovered = hoveredTaskId === item.task.id;
        return {
            position: 'absolute',
            left: "".concat((startOffsetDays / totalDays) * 100, "%"),
            width: "".concat((durationDays / totalDays) * 100, "%"),
            minWidth: '10px',
            top: '5px',
            bottom: '5px',
            borderRadius: '999px',
            backgroundColor: getStatusColor(item.status),
            color: '#e2e8f0',
            border: '1px solid rgba(15, 23, 42, 0.4)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            fontSize: '12px',
            fontWeight: 600,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            cursor: onTaskClick ? 'pointer' : 'default',
            transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
            boxShadow: isHovered ? '0 6px 14px rgba(0, 0, 0, 0.3)' : '0 2px 6px rgba(0, 0, 0, 0.2)',
            transition: 'transform 120ms ease, box-shadow 120ms ease, filter 120ms ease',
            filter: isHovered ? 'brightness(1.08)' : 'none'
        };
    };
    return (React.createElement("div", { style: { backgroundColor: '#171c33', color: '#e2e8f0', padding: '16px', display: 'grid', gap: '14px' } },
        React.createElement("div", { style: { display: 'grid', gridTemplateColumns: '180px 1fr', gap: '12px', alignItems: 'center' } },
            React.createElement("div", { style: { color: '#94a3b8', fontSize: '12px', fontWeight: 600 } }, "Timeline"),
            React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', fontWeight: 600 } }, ticks.map(function (tick) { return (React.createElement("span", { key: tick.toISOString() }, formatLabel(tick))); }))),
        statuses.map(function (status) { return (React.createElement("div", { key: status, style: { display: 'grid', gridTemplateColumns: '180px 1fr', gap: '12px', alignItems: 'start' } },
            React.createElement("div", { style: { color: '#cbd5e1', fontSize: '12px', fontWeight: 600, paddingTop: '10px' } }, status),
            React.createElement("div", { style: { display: 'grid', gap: '10px' } }, groupedByStatus[status].length === 0 ? (React.createElement("div", { style: { height: '34px', borderRadius: '8px', border: '1px dashed #334155', backgroundColor: '#1f2a44' } })) : (groupedByStatus[status].map(function (item) { return (React.createElement("div", { key: item.task.id, style: {
                    position: 'relative',
                    height: '34px',
                    borderRadius: '8px',
                    backgroundColor: '#1f2a44',
                    border: '1px solid #334155',
                    overflow: 'hidden'
                } },
                ticks.map(function (tick) {
                    var leftPct = ((tick.getTime() - timelineRange.minDate.getTime()) / (timelineRange.maxDate.getTime() - timelineRange.minDate.getTime() || 1)) * 100;
                    return (React.createElement("span", { key: "".concat(item.task.id, "-").concat(tick.toISOString()), style: {
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: "".concat(leftPct, "%"),
                            width: '1px',
                            backgroundColor: 'rgba(148, 163, 184, 0.18)',
                            pointerEvents: 'none'
                        } }));
                }),
                React.createElement("button", { type: "button", onClick: function () { return onTaskClick && onTaskClick(item.task.id); }, onMouseEnter: function () { return setHoveredTaskId(item.task.id); }, onMouseLeave: function () { return setHoveredTaskId(null); }, disabled: !onTaskClick, style: tslib_1.__assign(tslib_1.__assign({}, getTaskBarStyle(item)), { appearance: 'none', textAlign: 'left' }) }, item.task.title))); }))))); })));
};
exports.default = GanttView;
//# sourceMappingURL=GanttView.js.map