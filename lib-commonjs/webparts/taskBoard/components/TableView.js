"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var tableStyle = {
    width: '100%',
    tableLayout: 'fixed',
    borderCollapse: 'collapse',
    color: '#e2e8f0'
};
var cellStyle = {
    borderBottom: '1px solid #334155',
    borderRight: '1px solid #2b3a57',
    padding: '10px 12px',
    textAlign: 'left'
};
var headerCellStyle = tslib_1.__assign(tslib_1.__assign({}, cellStyle), { position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#24314a', fontWeight: 700 });
var columnWidths = {
    title: '33%',
    assignedTo: '15%',
    status: '12%',
    priority: '10%',
    dueDate: '12%',
    timeline: '18%'
};
var inputStyle = {
    width: '100%',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    border: '1px solid #475569',
    borderRadius: '6px',
    padding: '6px 8px'
};
var singleLineTextStyle = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block'
};
var avatarPalette = ['#2563eb', '#7c3aed', '#0ea5e9', '#f59e0b', '#22c55e', '#ec4899', '#14b8a6'];
var getInitials = function (name) {
    return name
        .split(' ')
        .filter(function (part) { return part.length > 0; })
        .slice(0, 2)
        .map(function (part) { return part.charAt(0).toUpperCase(); })
        .join('');
};
var getAvatarColor = function (name) {
    if (!name) {
        return '#64748b';
    }
    var hash = name.split('').reduce(function (acc, char) { return acc + char.charCodeAt(0); }, 0);
    return avatarPalette[hash % avatarPalette.length];
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
var getTimelineProgress = function (task) {
    var start = new Date(task.createdAt).getTime();
    var end = new Date(task.dueDate).getTime();
    var now = Date.now();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
        return task.dueDate ? 65 : 25;
    }
    if (now <= start) {
        return 5;
    }
    if (now >= end) {
        return 100;
    }
    return Math.round(((now - start) / (end - start)) * 100);
};
var formatDateReadable = function (value) {
    if (!value) {
        return 'N/A';
    }
    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};
var formatDateCompact = function (value) {
    if (!value) {
        return 'N/A';
    }
    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
    });
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
            if (!row) {
                return current;
            }
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
            task.assignedTo.toLowerCase().indexOf(normalizedSearch) > -1;
        if (!matchesSearch) {
            return false;
        }
        if (filterValue === 'All') {
            return true;
        }
        if (statuses.indexOf(filterValue) > -1) {
            return task.status === filterValue;
        }
        return task.priority === filterValue;
    })
        .sort(function (a, b) {
        if (sortDirection === 'None') {
            return 0;
        }
        var left = a.title.toLowerCase();
        var right = b.title.toLowerCase();
        var comparison = left.localeCompare(right);
        return sortDirection === 'Asc' ? comparison : -comparison;
    });
    return (React.createElement("div", { style: { padding: '8px', backgroundColor: '#171c33' } },
        React.createElement("div", { style: {
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                flexWrap: 'wrap',
                marginBottom: '8px',
                padding: '8px',
                backgroundColor: '#1f2a44',
                border: '1px solid #334155',
                borderRadius: '10px'
            } },
            React.createElement("input", { type: "text", value: searchTerm, onChange: function (event) { return setSearchTerm(event.target.value); }, placeholder: "Search tasks", style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { maxWidth: '260px' }) }),
            React.createElement("select", { value: filterValue, onChange: function (event) { return setFilterValue(event.target.value); }, style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { width: '200px' }) },
                React.createElement("option", { value: "All" }, "All"),
                statuses.map(function (status) { return (React.createElement("option", { key: status, value: status }, status)); }),
                React.createElement("option", { value: "Low" }, "Low Priority"),
                React.createElement("option", { value: "Medium" }, "Medium Priority"),
                React.createElement("option", { value: "High" }, "High Priority")),
            React.createElement("button", { type: "button", onClick: function () { return setSortDirection(function (current) { return (current === 'None' ? 'Asc' : current === 'Asc' ? 'Desc' : 'None'); }); }, style: {
                    backgroundColor: '#25344f',
                    color: '#e2e8f0',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '7px 12px',
                    cursor: 'pointer'
                } },
                "Sort: ",
                sortDirection)),
        React.createElement("div", { style: {
                overflowX: 'hidden',
                overflowY: 'auto',
                scrollBehavior: 'smooth',
                maxHeight: '70vh',
                border: '1px solid #334155',
                borderRadius: '12px',
                backgroundColor: '#1f2a44',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)'
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
                            React.createElement("td", { colSpan: 6, style: { height: '6px', padding: 0, border: 'none', backgroundColor: '#171c33' } }))),
                        React.createElement("tr", null,
                            React.createElement("td", { colSpan: 6, style: tslib_1.__assign(tslib_1.__assign({}, cellStyle), { borderRight: 'none', borderTop: '2px solid #3b4f6f', borderBottom: '1px solid #3b4f6f', borderLeft: "4px solid ".concat(getStatusColor(status)), backgroundColor: '#1a253d', padding: '10px 12px' }) },
                                React.createElement("button", { type: "button", onClick: function () { return toggleGroup(status); }, style: {
                                        width: '100%',
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#e2e8f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        fontWeight: 800,
                                        textAlign: 'left'
                                    } },
                                    React.createElement("span", null,
                                        isCollapsed ? '▸' : '▾',
                                        " ",
                                        status),
                                    React.createElement("span", { style: {
                                            color: '#e2e8f0',
                                            backgroundColor: '#1f2a44',
                                            border: '1px solid #475569',
                                            borderRadius: '999px',
                                            padding: '2px 8px',
                                            fontWeight: 700,
                                            fontSize: '11px'
                                        } }, groupedTasks.length)))),
                        !isCollapsed &&
                            groupedTasks.map(function (task) { return (React.createElement("tr", { key: task.id, onMouseEnter: function () { return setHoveredRowId(task.id); }, onMouseLeave: function () { return setHoveredRowId(null); }, style: {
                                    backgroundColor: hoveredRowId === task.id ? '#2a3b5b' : '#1b2840',
                                    transition: 'background-color 140ms ease'
                                } },
                                React.createElement("td", { style: cellStyle, onClick: function () { return startEditing(task, 'title'); } }, isEditing(task.id, 'title') ? (React.createElement("input", { type: "text", value: getCellValue(task, 'title'), onChange: function (event) { return handleCellChange(task.id, 'title', event.target.value); }, onFocus: function () { return setFocusedCell({ taskId: task.id, field: 'title' }); }, onBlur: function () { return commitCellEdit(task.id, 'title'); }, autoFocus: true, style: getEditorStyle(task.id, 'title') })) : (React.createElement("span", { style: singleLineTextStyle }, task.title))),
                                React.createElement("td", { style: cellStyle, onClick: function () { return canAssign && startEditing(task, 'assignedTo'); } }, canAssign && isEditing(task.id, 'assignedTo') ? (React.createElement("input", { type: "text", value: getCellValue(task, 'assignedTo'), onChange: function (event) { return handleCellChange(task.id, 'assignedTo', event.target.value); }, onFocus: function () { return setFocusedCell({ taskId: task.id, field: 'assignedTo' }); }, onBlur: function () { return commitCellEdit(task.id, 'assignedTo'); }, autoFocus: true, style: getEditorStyle(task.id, 'assignedTo') })) : (React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 } },
                                    React.createElement("span", { style: {
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            backgroundColor: getAvatarColor(task.assignedTo),
                                            color: '#e2e8f0',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '11px',
                                            fontWeight: 700
                                        } }, getInitials(task.assignedTo || 'Unassigned')),
                                    React.createElement("span", { style: singleLineTextStyle }, task.assignedTo || 'Unassigned')))),
                                React.createElement("td", { style: cellStyle, onClick: function () { return startEditing(task, 'status'); } }, isEditing(task.id, 'status') ? (React.createElement("select", { value: getCellValue(task, 'status'), onChange: function (event) { return handleCellChange(task.id, 'status', event.target.value); }, onFocus: function () { return setFocusedCell({ taskId: task.id, field: 'status' }); }, onBlur: function () { return commitCellEdit(task.id, 'status'); }, autoFocus: true, style: getEditorStyle(task.id, 'status') }, statuses.map(function (itemStatus) { return (React.createElement("option", { key: itemStatus, value: itemStatus }, itemStatus)); }))) : (React.createElement("span", { style: {
                                        backgroundColor: getStatusColor(task.status),
                                        color: '#f8fafc',
                                        borderRadius: '999px',
                                        padding: '2px 10px',
                                        fontSize: '11px',
                                        fontWeight: 600
                                    } }, task.status))),
                                React.createElement("td", { style: cellStyle, onClick: function () { return startEditing(task, 'priority'); } }, isEditing(task.id, 'priority') ? (React.createElement("select", { value: getCellValue(task, 'priority'), onChange: function (event) { return handleCellChange(task.id, 'priority', event.target.value); }, onFocus: function () { return setFocusedCell({ taskId: task.id, field: 'priority' }); }, onBlur: function () { return commitCellEdit(task.id, 'priority'); }, autoFocus: true, style: getEditorStyle(task.id, 'priority') },
                                    React.createElement("option", { value: "Low" }, "Low"),
                                    React.createElement("option", { value: "Medium" }, "Medium"),
                                    React.createElement("option", { value: "High" }, "High"))) : (React.createElement("span", { style: {
                                        backgroundColor: getPriorityColor(task.priority),
                                        color: '#0f172a',
                                        borderRadius: '999px',
                                        padding: '2px 10px',
                                        fontSize: '11px',
                                        fontWeight: 700
                                    } }, task.priority))),
                                React.createElement("td", { style: cellStyle, onClick: function () { return startEditing(task, 'dueDate'); } }, isEditing(task.id, 'dueDate') ? (React.createElement("input", { type: "date", value: getCellValue(task, 'dueDate'), onChange: function (event) { return handleCellChange(task.id, 'dueDate', event.target.value); }, onFocus: function () { return setFocusedCell({ taskId: task.id, field: 'dueDate' }); }, onBlur: function () { return commitCellEdit(task.id, 'dueDate'); }, autoFocus: true, style: getEditorStyle(task.id, 'dueDate') })) : (React.createElement("span", null, formatDateReadable(task.dueDate)))),
                                React.createElement("td", { style: tslib_1.__assign(tslib_1.__assign({}, cellStyle), { borderRight: 'none' }) },
                                    React.createElement("div", { style: { display: 'grid', gap: '6px', padding: '4px 4px' } },
                                        React.createElement("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: '6px', minHeight: '20px' } },
                                            React.createElement("button", { type: "button", onClick: function (event) {
                                                    event.stopPropagation();
                                                    startEditing(task, 'title');
                                                }, style: {
                                                    backgroundColor: '#334155',
                                                    color: '#f8fafc',
                                                    border: 'none',
                                                    borderRadius: '999px',
                                                    width: '22px',
                                                    height: '22px',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    opacity: hoveredRowId === task.id ? 1 : 0,
                                                    pointerEvents: hoveredRowId === task.id ? 'auto' : 'none',
                                                    transition: 'opacity 120ms ease'
                                                }, "aria-label": "Edit task" }, "\u270E"),
                                            React.createElement("button", { type: "button", onClick: function (event) {
                                                    event.stopPropagation();
                                                    deleteTask(task.id);
                                                }, style: {
                                                    backgroundColor: '#ef4444',
                                                    color: '#f8fafc',
                                                    border: 'none',
                                                    borderRadius: '999px',
                                                    width: '22px',
                                                    height: '22px',
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    opacity: hoveredRowId === task.id ? 1 : 0,
                                                    pointerEvents: hoveredRowId === task.id ? 'auto' : 'none',
                                                    transition: 'opacity 120ms ease'
                                                }, "aria-label": "Delete task" }, "\uD83D\uDDD1")),
                                        React.createElement("div", { style: {
                                                height: '14px',
                                                backgroundColor: '#111b2f',
                                                borderRadius: '999px',
                                                overflow: 'hidden',
                                                border: '1px solid #334155',
                                                padding: '1px'
                                            } },
                                            React.createElement("div", { style: {
                                                    width: "".concat(getTimelineProgress(task), "%"),
                                                    height: '100%',
                                                    background: 'linear-gradient(90deg, #0ea5e9, #22d3ee 45%, #22c55e)',
                                                    borderRadius: '999px'
                                                } })),
                                        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '10px' } },
                                            React.createElement("span", null, formatDateCompact(task.createdAt)),
                                            React.createElement("span", null, formatDateCompact(task.dueDate))))))); })));
                }))))));
};
exports.default = TableView;
//# sourceMappingURL=TableView.js.map