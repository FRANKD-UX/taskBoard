"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
// TableView.tsx
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var theme_1 = require("./theme");
// ---------------------------------------------------------------------------
// Static styles — all colors pulled from THEME so this view matches BoardView
// ---------------------------------------------------------------------------
var tableStyle = {
    width: '100%',
    tableLayout: 'fixed',
    borderCollapse: 'collapse',
    color: theme_1.THEME.colors.textPrimary,
};
var cellStyle = {
    borderBottom: "1px solid ".concat(theme_1.THEME.colors.border),
    borderRight: "1px solid ".concat(theme_1.THEME.colors.border),
    padding: '10px 12px',
    textAlign: 'left',
};
var headerCellStyle = tslib_1.__assign(tslib_1.__assign({}, cellStyle), { position: 'sticky', top: 0, zIndex: 2, backgroundColor: theme_1.THEME.colors.panel, color: theme_1.THEME.colors.textStrong, fontWeight: 700, borderBottom: "2px solid ".concat(theme_1.THEME.colors.border) });
var columnWidths = {
    title: '33%',
    assignedTo: '15%',
    status: '12%',
    priority: '10%',
    dueDate: '12%',
    timeline: '18%',
};
var inputStyle = {
    width: '100%',
    backgroundColor: theme_1.THEME.colors.background,
    color: theme_1.THEME.colors.textStrong,
    border: "1px solid ".concat(theme_1.THEME.colors.border),
    borderRadius: '6px',
    padding: '6px 8px',
};
var singleLineTextStyle = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
};
// ---------------------------------------------------------------------------
// Pure helper functions — no side effects, easy to test in isolation
// ---------------------------------------------------------------------------
var avatarPalette = ['#2563eb', '#7c3aed', '#0ea5e9', '#f59e0b', '#22c55e', '#ec4899', '#14b8a6'];
var getInitials = function (name) {
    if (!name || name === 'Unassigned')
        return 'U';
    return name
        .split(' ')
        .filter(function (part) { return part.length > 0; })
        .slice(0, 2)
        .map(function (part) { return part.charAt(0).toUpperCase(); })
        .join('');
};
var getAvatarColor = function (name) {
    if (!name || name === 'Unassigned')
        return '#64748b';
    var hash = name.split('').reduce(function (acc, char) { return acc + char.charCodeAt(0); }, 0);
    return avatarPalette[hash % avatarPalette.length];
};
var getTimelineProgress = function (task) {
    var start = new Date(task.createdAt || new Date()).getTime();
    var end = new Date(task.dueDate || new Date()).getTime();
    var now = Date.now();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
        return task.dueDate ? 65 : 25;
    }
    if (now <= start)
        return 5;
    if (now >= end)
        return 100;
    return Math.round(((now - start) / (end - start)) * 100);
};
var formatDateReadable = function (value) {
    if (!value)
        return 'N/A';
    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return value;
    return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};
var formatDateCompact = function (value) {
    if (!value)
        return 'N/A';
    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return value;
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
var TableView = function (_a) {
    var tasks = _a.tasks, statuses = _a.statuses, updateTask = _a.updateTask, deleteTask = _a.deleteTask, canAssign = _a.canAssign;
    var _b = (0, react_1.useState)(null), editingCell = _b[0], setEditingCell = _b[1];
    var _c = (0, react_1.useState)(null), hoveredRowId = _c[0], setHoveredRowId = _c[1];
    var _d = (0, react_1.useState)(null), focusedCell = _d[0], setFocusedCell = _d[1];
    var _e = (0, react_1.useState)({}), rowDrafts = _e[0], setRowDrafts = _e[1];
    var _f = (0, react_1.useState)(''), searchTerm = _f[0], setSearchTerm = _f[1];
    var _g = (0, react_1.useState)('All'), filterValue = _g[0], setFilterValue = _g[1];
    var _h = (0, react_1.useState)('None'), sortDirection = _h[0], setSortDirection = _h[1];
    var _j = (0, react_1.useState)(function () {
        return statuses.reduce(function (acc, status) {
            acc[status] = false;
            return acc;
        }, {});
    }), collapsedGroups = _j[0], setCollapsedGroups = _j[1];
    // ---------------------------------------------------------------------------
    // Cell editing helpers
    // ---------------------------------------------------------------------------
    var isEditing = function (taskId, field) {
        return (editingCell === null || editingCell === void 0 ? void 0 : editingCell.taskId) === taskId && (editingCell === null || editingCell === void 0 ? void 0 : editingCell.field) === field;
    };
    var getCellValue = function (task, field) {
        var _a;
        var draftValue = (_a = rowDrafts[task.id]) === null || _a === void 0 ? void 0 : _a[field];
        return draftValue !== undefined ? draftValue : task[field];
    };
    var startEditing = function (task, field) {
        setEditingCell({ taskId: task.id, field: field });
        setRowDrafts(function (current) {
            var _a, _b;
            return (tslib_1.__assign(tslib_1.__assign({}, current), (_a = {}, _a[task.id] = tslib_1.__assign(tslib_1.__assign({}, current[task.id]), (_b = {}, _b[field] = task[field], _b)), _a)));
        });
    };
    var handleCellChange = function (taskId, field, value) {
        setRowDrafts(function (current) {
            var _a, _b;
            return (tslib_1.__assign(tslib_1.__assign({}, current), (_a = {}, _a[taskId] = tslib_1.__assign(tslib_1.__assign({}, current[taskId]), (_b = {}, _b[field] = value, _b)), _a)));
        });
    };
    var commitCellEdit = function (taskId, field) {
        var _a;
        var _b;
        var value = (_b = rowDrafts[taskId]) === null || _b === void 0 ? void 0 : _b[field];
        if (value !== undefined) {
            updateTask(taskId, (_a = {}, _a[field] = value, _a));
        }
        setRowDrafts(function (current) {
            var _a;
            var row = current[taskId];
            if (!row)
                return current;
            var _b = row, _c = field, _removed = _b[_c], remainingFields = tslib_1.__rest(_b, [typeof _c === "symbol" ? _c : _c + ""]);
            if (Object.keys(remainingFields).length === 0) {
                var _d = current, _e = taskId, _removedRow = _d[_e], remainingRows = tslib_1.__rest(_d, [typeof _e === "symbol" ? _e : _e + ""]);
                return remainingRows;
            }
            return tslib_1.__assign(tslib_1.__assign({}, current), (_a = {}, _a[taskId] = remainingFields, _a));
        });
        setEditingCell(null);
        setFocusedCell(null);
    };
    var getEditorStyle = function (taskId, field) {
        var isFocused = (focusedCell === null || focusedCell === void 0 ? void 0 : focusedCell.taskId) === taskId && (focusedCell === null || focusedCell === void 0 ? void 0 : focusedCell.field) === field;
        return tslib_1.__assign(tslib_1.__assign({}, inputStyle), { border: isFocused ? '1px solid #60a5fa' : inputStyle.border, boxShadow: isFocused ? '0 0 0 2px rgba(96, 165, 250, 0.25)' : 'none' });
    };
    var toggleGroup = function (status) {
        setCollapsedGroups(function (current) {
            var _a;
            return (tslib_1.__assign(tslib_1.__assign({}, current), (_a = {}, _a[status] = !current[status], _a)));
        });
    };
    // ---------------------------------------------------------------------------
    // Filtering and sorting
    // ---------------------------------------------------------------------------
    var getTasksForStatus = function (status) {
        if (status === 'Unassigned') {
            return filteredTasks.filter(function (task) { return task.status === status || statuses.indexOf(task.status) === -1; });
        }
        return filteredTasks.filter(function (task) { return task.status === status; });
    };
    var filteredTasks = tasks
        .filter(function (task) {
        var normalizedSearch = searchTerm.trim().toLowerCase();
        var matchesSearch = normalizedSearch.length === 0 ||
            task.title.toLowerCase().indexOf(normalizedSearch) > -1 ||
            (task.assignedTo || '').toLowerCase().indexOf(normalizedSearch) > -1;
        if (!matchesSearch)
            return false;
        if (filterValue === 'All')
            return true;
        if (statuses.indexOf(filterValue) > -1)
            return task.status === filterValue;
        return task.priority === filterValue;
    })
        .sort(function (a, b) {
        if (sortDirection === 'None')
            return 0;
        var comparison = a.title.toLowerCase().localeCompare(b.title.toLowerCase());
        return sortDirection === 'Asc' ? comparison : -comparison;
    });
    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (React.createElement("div", { style: { padding: '8px', backgroundColor: theme_1.THEME.colors.background } },
        React.createElement("div", { style: {
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                flexWrap: 'wrap',
                marginBottom: '8px',
                padding: '8px',
                backgroundColor: theme_1.THEME.colors.panel,
                border: "1px solid ".concat(theme_1.THEME.colors.border),
                borderRadius: '10px',
            } },
            React.createElement("input", { type: "text", value: searchTerm, onChange: function (event) { return setSearchTerm(event.target.value); }, placeholder: "Search tasks", style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { maxWidth: '260px' }) }),
            React.createElement("select", { value: filterValue, onChange: function (event) { return setFilterValue(event.target.value); }, style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { width: '200px' }) },
                React.createElement("option", { value: "All" }, "All"),
                statuses.map(function (status) { return (React.createElement("option", { key: status, value: status }, status)); }),
                React.createElement("option", { value: "Low" }, "Low Priority"),
                React.createElement("option", { value: "Medium" }, "Medium Priority"),
                React.createElement("option", { value: "High" }, "High Priority")),
            React.createElement("button", { type: "button", onClick: function () { return setSortDirection(function (current) { return current === 'None' ? 'Asc' : current === 'Asc' ? 'Desc' : 'None'; }); }, style: {
                    backgroundColor: theme_1.THEME.colors.panel,
                    color: theme_1.THEME.colors.textPrimary,
                    border: "1px solid ".concat(theme_1.THEME.colors.border),
                    borderRadius: '8px',
                    padding: '7px 12px',
                    cursor: 'pointer',
                } },
                "Sort: ",
                sortDirection)),
        React.createElement("div", { style: {
                overflowX: 'hidden',
                overflowY: 'auto',
                scrollBehavior: 'smooth',
                maxHeight: '70vh',
                border: "1px solid ".concat(theme_1.THEME.colors.border),
                borderRadius: '12px',
                backgroundColor: theme_1.THEME.colors.panel,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)',
            } },
            React.createElement("table", { style: tableStyle },
                React.createElement("colgroup", null,
                    React.createElement("col", { style: { width: columnWidths.title } }),
                    React.createElement("col", { style: { width: columnWidths.assignedTo } }),
                    React.createElement("col", { style: { width: columnWidths.status } }),
                    React.createElement("col", { style: { width: columnWidths.priority } }),
                    React.createElement("col", { style: { width: columnWidths.dueDate } }),
                    React.createElement("col", { style: { width: columnWidths.timeline } })),
                React.createElement("thead", null,
                    React.createElement("tr", null,
                        React.createElement("th", { style: headerCellStyle }, "Task Name"),
                        React.createElement("th", { style: headerCellStyle }, "Assigned To"),
                        React.createElement("th", { style: headerCellStyle }, "Status"),
                        React.createElement("th", { style: headerCellStyle }, "Priority"),
                        React.createElement("th", { style: headerCellStyle }, "Due Date"),
                        React.createElement("th", { style: tslib_1.__assign(tslib_1.__assign({}, headerCellStyle), { borderRight: 'none' }) }, "Timeline"))),
                React.createElement("tbody", null, statuses.map(function (status, groupIndex) {
                    var groupedTasks = getTasksForStatus(status);
                    var isCollapsed = Boolean(collapsedGroups[status]);
                    return (React.createElement(React.Fragment, { key: status },
                        groupIndex > 0 && (React.createElement("tr", null,
                            React.createElement("td", { colSpan: 6, style: { height: '6px', padding: 0, border: 'none', backgroundColor: theme_1.THEME.colors.background } }))),
                        React.createElement("tr", null,
                            React.createElement("td", { colSpan: 6, style: tslib_1.__assign(tslib_1.__assign({}, cellStyle), { borderRight: 'none', borderTop: "2px solid ".concat(theme_1.THEME.colors.border), borderBottom: "1px solid ".concat(theme_1.THEME.colors.border), borderLeft: "4px solid ".concat(theme_1.THEME.statusColors[status]), backgroundColor: theme_1.THEME.colors.surfaceHover, padding: '10px 12px' }) },
                                React.createElement("button", { type: "button", onClick: function () { return toggleGroup(status); }, style: {
                                        width: '100%',
                                        background: 'transparent',
                                        border: 'none',
                                        color: theme_1.THEME.colors.textPrimary,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        fontWeight: 800,
                                        textAlign: 'left',
                                    } },
                                    React.createElement("span", null,
                                        isCollapsed ? '▸' : '▾',
                                        " ",
                                        status),
                                    React.createElement("span", { style: {
                                            color: theme_1.THEME.colors.textPrimary,
                                            backgroundColor: theme_1.THEME.colors.panel,
                                            border: "1px solid ".concat(theme_1.THEME.colors.border),
                                            borderRadius: '999px',
                                            padding: '2px 8px',
                                            fontWeight: 700,
                                            fontSize: '11px',
                                        } }, groupedTasks.length)))),
                        !isCollapsed &&
                            groupedTasks.map(function (task) { return (React.createElement("tr", { key: task.id, onMouseEnter: function () { return setHoveredRowId(task.id); }, onMouseLeave: function () { return setHoveredRowId(null); }, style: {
                                    backgroundColor: hoveredRowId === task.id ? theme_1.THEME.colors.surfaceHover : theme_1.THEME.colors.panel,
                                    transition: 'background-color 140ms ease',
                                } },
                                React.createElement("td", { style: cellStyle, onClick: function () { return startEditing(task, 'title'); } }, isEditing(task.id, 'title') ? (React.createElement("input", { type: "text", value: getCellValue(task, 'title'), onChange: function (event) { return handleCellChange(task.id, 'title', event.target.value); }, onFocus: function () { return setFocusedCell({ taskId: task.id, field: 'title' }); }, onBlur: function () { return commitCellEdit(task.id, 'title'); }, autoFocus: true, style: getEditorStyle(task.id, 'title') })) : (React.createElement("span", { style: singleLineTextStyle }, task.title))),
                                React.createElement("td", { style: cellStyle, onClick: function () { return canAssign && startEditing(task, 'assignedTo'); } }, canAssign && isEditing(task.id, 'assignedTo') ? (React.createElement("input", { type: "text", value: getCellValue(task, 'assignedTo'), onChange: function (event) { return handleCellChange(task.id, 'assignedTo', event.target.value); }, onFocus: function () { return setFocusedCell({ taskId: task.id, field: 'assignedTo' }); }, onBlur: function () { return commitCellEdit(task.id, 'assignedTo'); }, autoFocus: true, style: getEditorStyle(task.id, 'assignedTo') })) : (React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 } },
                                    React.createElement("span", { style: {
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            backgroundColor: getAvatarColor(task.assignedTo || 'Unassigned'),
                                            color: '#ffffff',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            flexShrink: 0,
                                        } }, getInitials(task.assignedTo || 'Unassigned')),
                                    React.createElement("span", { style: singleLineTextStyle }, task.assignedTo || 'Unassigned')))),
                                React.createElement("td", { style: cellStyle, onClick: function () { return startEditing(task, 'status'); } }, isEditing(task.id, 'status') ? (React.createElement("select", { value: getCellValue(task, 'status'), onChange: function (event) { return handleCellChange(task.id, 'status', event.target.value); }, onFocus: function () { return setFocusedCell({ taskId: task.id, field: 'status' }); }, onBlur: function () { return commitCellEdit(task.id, 'status'); }, autoFocus: true, style: getEditorStyle(task.id, 'status') }, statuses.map(function (itemStatus) { return (React.createElement("option", { key: itemStatus, value: itemStatus }, itemStatus)); }))) : (React.createElement("span", { style: {
                                        backgroundColor: theme_1.THEME.statusColors[task.status],
                                        color: '#ffffff',
                                        borderRadius: '999px',
                                        padding: '2px 10px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                    } }, task.status))),
                                React.createElement("td", { style: cellStyle, onClick: function () { return startEditing(task, 'priority'); } }, isEditing(task.id, 'priority') ? (React.createElement("select", { value: getCellValue(task, 'priority'), onChange: function (event) { return handleCellChange(task.id, 'priority', event.target.value); }, onFocus: function () { return setFocusedCell({ taskId: task.id, field: 'priority' }); }, onBlur: function () { return commitCellEdit(task.id, 'priority'); }, autoFocus: true, style: getEditorStyle(task.id, 'priority') },
                                    React.createElement("option", { value: "Low" }, "Low"),
                                    React.createElement("option", { value: "Medium" }, "Medium"),
                                    React.createElement("option", { value: "High" }, "High"))) : (React.createElement("span", { style: {
                                        backgroundColor: theme_1.THEME.priorityColors[task.priority],
                                        color: '#0f172a',
                                        borderRadius: '999px',
                                        padding: '2px 10px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                    } }, task.priority))),
                                React.createElement("td", { style: cellStyle, onClick: function () { return startEditing(task, 'dueDate'); } }, isEditing(task.id, 'dueDate') ? (React.createElement("input", { type: "date", value: getCellValue(task, 'dueDate'), onChange: function (event) { return handleCellChange(task.id, 'dueDate', event.target.value); }, onFocus: function () { return setFocusedCell({ taskId: task.id, field: 'dueDate' }); }, onBlur: function () { return commitCellEdit(task.id, 'dueDate'); }, autoFocus: true, style: getEditorStyle(task.id, 'dueDate') })) : (React.createElement("span", null, formatDateReadable(task.dueDate)))),
                                React.createElement("td", { style: tslib_1.__assign(tslib_1.__assign({}, cellStyle), { borderRight: 'none' }) },
                                    React.createElement("div", { style: { display: 'grid', gap: '6px', padding: '4px 4px' } },
                                        React.createElement("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: '6px', minHeight: '20px' } },
                                            React.createElement("button", { type: "button", onClick: function (event) { event.stopPropagation(); startEditing(task, 'title'); }, style: {
                                                    backgroundColor: theme_1.THEME.colors.surfaceHover,
                                                    color: theme_1.THEME.colors.textPrimary,
                                                    border: "1px solid ".concat(theme_1.THEME.colors.border),
                                                    borderRadius: '999px',
                                                    width: '22px',
                                                    height: '22px',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    opacity: hoveredRowId === task.id ? 1 : 0,
                                                    pointerEvents: hoveredRowId === task.id ? 'auto' : 'none',
                                                    transition: 'opacity 120ms ease',
                                                }, "aria-label": "Edit task" }, "\u270E"),
                                            React.createElement("button", { type: "button", onClick: function (event) { event.stopPropagation(); deleteTask(task.id); }, style: {
                                                    backgroundColor: '#ef4444',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    borderRadius: '999px',
                                                    width: '22px',
                                                    height: '22px',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    opacity: hoveredRowId === task.id ? 1 : 0,
                                                    pointerEvents: hoveredRowId === task.id ? 'auto' : 'none',
                                                    transition: 'opacity 120ms ease',
                                                }, "aria-label": "Delete task" }, "x")),
                                        React.createElement("div", { style: {
                                                height: '14px',
                                                backgroundColor: theme_1.THEME.colors.background,
                                                borderRadius: '999px',
                                                overflow: 'hidden',
                                                border: "1px solid ".concat(theme_1.THEME.colors.border),
                                                padding: '1px',
                                            } },
                                            React.createElement("div", { style: {
                                                    width: "".concat(getTimelineProgress(task), "%"),
                                                    height: '100%',
                                                    background: 'linear-gradient(90deg, #0ea5e9, #22d3ee 45%, #22c55e)',
                                                    borderRadius: '999px',
                                                } })),
                                        React.createElement("div", { style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                color: theme_1.THEME.colors.textSecondary,
                                                fontSize: '10px',
                                            } },
                                            React.createElement("span", null, formatDateCompact(task.createdAt)),
                                            React.createElement("span", null, formatDateCompact(task.dueDate))))))); })));
                }))))));
};
exports.default = TableView;
//# sourceMappingURL=TableView.js.map