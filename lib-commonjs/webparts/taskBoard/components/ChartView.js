"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var theme_1 = require("./theme");
var ChartView = function (_a) {
    var tasks = _a.tasks, statuses = _a.statuses;
    var statusCounts = (0, react_1.useMemo)(function () {
        var initial = statuses.reduce(function (acc, status) {
            acc[status] = 0;
            return acc;
        }, {});
        tasks.forEach(function (task) {
            var status = task.status;
            if (status in initial) {
                initial[status] += 1;
            }
        });
        return initial;
    }, [statuses, tasks]);
    var priorityOrder = ['High', 'Medium', 'Low'];
    var priorityCounts = (0, react_1.useMemo)(function () {
        var initial = {
            High: 0,
            Medium: 0,
            Low: 0
        };
        tasks.forEach(function (task) {
            initial[task.priority] += 1;
        });
        return initial;
    }, [tasks]);
    var buildPieBackground = function (slices) {
        var total = Math.max(1, slices.reduce(function (sum, slice) { return sum + slice.value; }, 0));
        var currentAngle = 0;
        var segments = slices.map(function (slice) {
            var startAngle = currentAngle;
            var angle = (slice.value / total) * 360;
            currentAngle += angle;
            return "".concat(slice.color, " ").concat(startAngle, "deg ").concat(currentAngle, "deg");
        });
        return "conic-gradient(".concat(segments.join(', '), ")");
    };
    var statusSlices = statuses.map(function (status) { return ({
        label: status,
        value: statusCounts[status],
        color: theme_1.THEME.statusColors[status]
    }); });
    var prioritySlices = priorityOrder.map(function (priority) { return ({
        label: priority,
        value: priorityCounts[priority],
        color: theme_1.THEME.priorityColors[priority]
    }); });
    var renderLegend = function (slices) {
        return (React.createElement("div", { style: { display: 'grid', gap: '10px' } }, slices.map(function (slice) { return (React.createElement("div", { key: slice.label, style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                border: "1px solid ".concat(theme_1.THEME.colors.border),
                borderRadius: '8px',
                padding: '6px 8px',
                backgroundColor: 'rgba(15, 23, 42, 0.25)'
            } },
            React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', color: theme_1.THEME.colors.textPrimary } },
                React.createElement("span", { style: {
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: slice.color,
                        display: 'inline-block'
                    } }),
                React.createElement("span", null, slice.label)),
            React.createElement("span", { style: { color: theme_1.THEME.colors.textStrong, fontWeight: 700 } }, slice.value))); })));
    };
    return (React.createElement("div", { style: {
            padding: '20px',
            backgroundColor: theme_1.THEME.colors.background,
            color: theme_1.THEME.colors.textPrimary,
            display: 'grid',
            gap: '20px'
        } },
        React.createElement("section", { style: { backgroundColor: theme_1.THEME.colors.panel, borderRadius: '12px', padding: '18px' } },
            React.createElement("h3", { style: { margin: '0 0 14px 0', fontSize: '14px', color: theme_1.THEME.colors.textStrong } }, "Status Distribution"),
            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr)', justifyItems: 'center', gap: '14px' } },
                React.createElement("div", { style: {
                        width: '170px',
                        height: '170px',
                        borderRadius: '50%',
                        background: buildPieBackground(statusSlices),
                        border: "1px solid ".concat(theme_1.THEME.colors.border)
                    } }),
                React.createElement("div", { style: { width: '100%', maxWidth: '360px' } }, renderLegend(statusSlices)))),
        React.createElement("section", { style: { backgroundColor: theme_1.THEME.colors.panel, borderRadius: '12px', padding: '18px' } },
            React.createElement("h3", { style: { margin: '0 0 14px 0', fontSize: '14px', color: theme_1.THEME.colors.textStrong } }, "Priority Distribution"),
            React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr)', justifyItems: 'center', gap: '14px' } },
                React.createElement("div", { style: {
                        width: '170px',
                        height: '170px',
                        borderRadius: '50%',
                        background: buildPieBackground(prioritySlices),
                        border: "1px solid ".concat(theme_1.THEME.colors.border)
                    } }),
                React.createElement("div", { style: { width: '100%', maxWidth: '360px' } }, renderLegend(prioritySlices))))));
};
exports.default = ChartView;
//# sourceMappingURL=ChartView.js.map