"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var pnpjsConfig_1 = require("../../../pnpjsConfig");
var panelContainerStyle = {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '350px',
    height: '100vh',
    backgroundColor: '#1f2a44',
    color: '#f8fafc',
    borderLeft: '1px solid #334155',
    zIndex: 1100,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto'
};
var inputStyle = {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '8px'
};
var statusOptions = ['Unassigned', 'Backlog', 'ThisWeek', 'InProgress', 'Completed'];
var requestTypeOptions = ['Task', 'Incident'];
var departmentOptions = ['IT', 'Finance', 'Operations'];
var TaskPanel = function (_a) {
    var selectedTask = _a.selectedTask, updateTask = _a.updateTask, deleteTask = _a.deleteTask, onClose = _a.onClose, canAssign = _a.canAssign;
    var dueDateInputRef = React.useRef(null);
    var _b = (0, react_1.useState)([]), userOptions = _b[0], setUserOptions = _b[1];
    var _c = (0, react_1.useState)(''), assignedQuery = _c[0], setAssignedQuery = _c[1];
    var _d = (0, react_1.useState)(false), showUserSuggestions = _d[0], setShowUserSuggestions = _d[1];
    (0, react_1.useEffect)(function () {
        var loadUsers = function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
            var sp, users, _a;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        sp = (0, pnpjsConfig_1.getSP)();
                        return [4 /*yield*/, sp.web.siteUsers.select('Id', 'Title', 'Email').top(100)()];
                    case 1:
                        users = _b.sent();
                        setUserOptions(users
                            .filter(function (user) { return Boolean(user === null || user === void 0 ? void 0 : user.Title); })
                            .map(function (user) { return ({
                            id: user.Id,
                            name: user.Title,
                            email: user.Email
                        }); }));
                        return [3 /*break*/, 3];
                    case 2:
                        _a = _b.sent();
                        setUserOptions([]);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        loadUsers().catch(function () { return undefined; });
    }, []);
    (0, react_1.useEffect)(function () {
        if (!selectedTask) {
            setAssignedQuery('');
            setShowUserSuggestions(false);
            return;
        }
        setAssignedQuery(selectedTask.assignedTo || '');
        setShowUserSuggestions(false);
    }, [selectedTask]);
    var filteredUserOptions = (0, react_1.useMemo)(function () {
        var query = assignedQuery.trim().toLowerCase();
        if (!query) {
            return userOptions.slice(0, 6);
        }
        return userOptions.filter(function (user) { return user.name.toLowerCase().indexOf(query) > -1; }).slice(0, 6);
    }, [assignedQuery, userOptions]);
    var handleAssigneeSelect = function (user) {
        setAssignedQuery(user.name);
        setShowUserSuggestions(false);
        handleUpdateTask({
            assignedTo: user.name,
            assignedToId: user.id
        });
    };
    var handleAssigneeInputChange = function (value) {
        setAssignedQuery(value);
        setShowUserSuggestions(true);
        var exactMatch = userOptions.find(function (user) { return user.name.toLowerCase() === value.trim().toLowerCase(); });
        if (exactMatch) {
            handleUpdateTask({
                assignedTo: exactMatch.name,
                assignedToId: exactMatch.id
            });
            return;
        }
        handleUpdateTask({
            assignedTo: value,
            assignedToId: undefined
        });
    };
    var openDueDatePicker = function () {
        var input = dueDateInputRef.current;
        if (input && typeof input.showPicker === 'function') {
            input.showPicker();
        }
    };
    var handleUpdateTask = function (changes) {
        if (!selectedTask) {
            return;
        }
        updateTask(selectedTask.id, changes);
    };
    var handleDeleteTask = function () {
        if (!selectedTask) {
            return;
        }
        deleteTask(selectedTask.id);
        onClose();
    };
    var handleSaveAndClose = function () {
        onClose();
    };
    if (!selectedTask) {
        return null;
    }
    return (React.createElement("div", { style: panelContainerStyle },
        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            React.createElement("strong", null, "Task Details"),
            React.createElement("button", { type: "button", onClick: onClose, style: { background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '18px' } }, "\u00D7")),
        React.createElement("label", { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            React.createElement("span", { style: { color: '#cbd5e1', fontSize: '12px' } }, "Title"),
            React.createElement("input", { type: "text", value: selectedTask.title, onChange: function (event) { return handleUpdateTask({ title: event.target.value }); }, style: inputStyle })),
        React.createElement("label", { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            React.createElement("span", { style: { color: '#cbd5e1', fontSize: '12px' } }, "Assigned user"),
            canAssign ? (React.createElement("div", { style: { display: 'grid', gap: '6px', position: 'relative' } },
                React.createElement("input", { type: "text", value: assignedQuery, onChange: function (event) { return handleAssigneeInputChange(event.target.value); }, onFocus: function () { return setShowUserSuggestions(true); }, placeholder: "Type a name", style: inputStyle }),
                showUserSuggestions && filteredUserOptions.length > 0 && (React.createElement("div", { style: {
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        backgroundColor: '#0f172a',
                        overflow: 'hidden'
                    } }, filteredUserOptions.map(function (user) { return (React.createElement("button", { key: user.id, type: "button", onMouseDown: function (event) {
                        event.preventDefault();
                        handleAssigneeSelect(user);
                    }, style: {
                        width: '100%',
                        backgroundColor: 'transparent',
                        color: '#f8fafc',
                        border: 'none',
                        borderBottom: '1px solid #1f2937',
                        textAlign: 'left',
                        padding: '8px',
                        cursor: 'pointer'
                    } }, user.name)); }))))) : (React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                React.createElement("span", { style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { backgroundColor: '#111827' }) }, selectedTask.assignedTo || 'Unassigned'),
                React.createElement("span", { style: { color: '#fbbf24', fontSize: '11px' } }, "\uD83D\uDD12 Assignment restricted (Manager required)")))),
        React.createElement("label", { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            React.createElement("span", { style: { color: '#cbd5e1', fontSize: '12px' } }, "Request Type"),
            React.createElement("select", { value: selectedTask.requestType || 'Task', onChange: function (event) { return handleUpdateTask({ requestType: event.target.value }); }, style: inputStyle }, requestTypeOptions.map(function (type) { return (React.createElement("option", { key: type, value: type }, type)); }))),
        React.createElement("label", { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            React.createElement("span", { style: { color: '#cbd5e1', fontSize: '12px' } }, "Department"),
            React.createElement("select", { value: selectedTask.department || 'IT', onChange: function (event) { return handleUpdateTask({ department: event.target.value }); }, style: inputStyle }, departmentOptions.map(function (department) { return (React.createElement("option", { key: department, value: department }, department)); }))),
        React.createElement("label", { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            React.createElement("span", { style: { color: '#cbd5e1', fontSize: '12px' } }, "Status"),
            React.createElement("select", { value: selectedTask.status, onChange: function (event) { return handleUpdateTask({ status: event.target.value }); }, style: inputStyle }, statusOptions.map(function (status) { return (React.createElement("option", { key: status, value: status }, status)); }))),
        React.createElement("label", { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            React.createElement("span", { style: { color: '#cbd5e1', fontSize: '12px' } }, "Due date"),
            React.createElement("input", { ref: dueDateInputRef, type: "date", value: selectedTask.dueDate, onChange: function (event) { return handleUpdateTask({ dueDate: event.target.value }); }, onClick: openDueDatePicker, onFocus: openDueDatePicker, onKeyDown: function (event) {
                    if (event.key !== 'Tab') {
                        event.preventDefault();
                    }
                }, inputMode: "none", style: inputStyle })),
        React.createElement("label", { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            React.createElement("span", { style: { color: '#cbd5e1', fontSize: '12px' } }, "Priority"),
            React.createElement("select", { value: selectedTask.priority, onChange: function (event) { return handleUpdateTask({ priority: event.target.value }); }, style: inputStyle },
                React.createElement("option", { value: "Low" }, "Low"),
                React.createElement("option", { value: "Medium" }, "Medium"),
                React.createElement("option", { value: "High" }, "High"))),
        React.createElement("label", { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            React.createElement("span", { style: { color: '#cbd5e1', fontSize: '12px' } }, "Description"),
            React.createElement("textarea", { value: selectedTask.description || '', onChange: function (event) { return handleUpdateTask({ description: event.target.value }); }, rows: 4, style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { resize: 'vertical' }) })),
        React.createElement("label", { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            React.createElement("span", { style: { color: '#cbd5e1', fontSize: '12px' } }, "Created By"),
            React.createElement("span", { style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { backgroundColor: '#111827' }) }, selectedTask.createdBy || 'Unknown')),
        React.createElement("button", { type: "button", onClick: handleSaveAndClose, style: {
                marginTop: '8px',
                backgroundColor: '#065f46',
                color: '#d1fae5',
                border: '1px solid #047857',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer'
            } }, "Save & Close"),
        React.createElement("button", { type: "button", onClick: handleDeleteTask, style: {
                marginTop: '8px',
                backgroundColor: '#7f1d1d',
                color: '#fecaca',
                border: '1px solid #991b1b',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer'
            } }, "Delete Task")));
};
exports.default = TaskPanel;
//# sourceMappingURL=TaskPanel.js.map