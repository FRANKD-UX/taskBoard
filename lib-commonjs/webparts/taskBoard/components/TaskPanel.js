"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
// TaskPanel.tsx
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var theme_1 = require("./theme");
var PeoplePicker_1 = tslib_1.__importDefault(require("./PeoplePicker"));
var CollaborationPanel_1 = tslib_1.__importDefault(require("./CollaborationPanel"));
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
// Albertsdal is listed first so it appears at the top of the dropdown.
var SITES = [
    { value: 'Albertsdal', label: 'Albertsdal (Main Office)' },
    { value: 'Troyville', label: 'Troyville (Secondary Office)' },
];
// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
var panelStyle = {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '380px',
    maxWidth: '90vw',
    height: '100vh',
    backgroundColor: theme_1.THEME.colors.panel,
    boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    color: theme_1.THEME.colors.textPrimary,
    borderLeft: "1px solid ".concat(theme_1.THEME.colors.border),
    overflowY: 'auto',
    transition: 'transform 0.25s ease',
};
var overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
};
var headerStyle = {
    padding: '20px 20px 16px',
    borderBottom: "1px solid ".concat(theme_1.THEME.colors.border),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
};
var sectionStyle = {
    padding: '16px 20px',
    borderBottom: "1px solid ".concat(theme_1.THEME.colors.border),
};
var labelStyle = {
    fontSize: '12px',
    fontWeight: 600,
    color: theme_1.THEME.colors.textSecondary,
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
};
var inputStyle = {
    backgroundColor: theme_1.THEME.colors.background,
    color: theme_1.THEME.colors.textStrong,
    border: "1px solid ".concat(theme_1.THEME.colors.border),
    borderRadius: '8px',
    padding: '10px 12px',
    width: '100%',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
};
var primaryButtonStyle = {
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    backgroundColor: theme_1.THEME.colors.primary,
    color: '#ffffff',
    transition: 'background-color 0.15s, opacity 0.15s',
};
var dangerButtonStyle = {
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    transition: 'background-color 0.15s, opacity 0.15s',
};
// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
var buildResolvedUserFromTask = function (task) {
    var _a, _b, _c, _d, _e;
    if (!task.assignedTo && !task.assignedToEmail)
        return null;
    return {
        id: (_a = task.assignedToId) !== null && _a !== void 0 ? _a : null,
        name: (_b = task.assignedTo) !== null && _b !== void 0 ? _b : '',
        email: (_d = (_c = task.assignedToEmail) !== null && _c !== void 0 ? _c : task.assignedTo) !== null && _d !== void 0 ? _d : '',
        loginName: (_e = task.assignedToLoginName) !== null && _e !== void 0 ? _e : '',
    };
};
// Converts the string task id to a numeric SP item ID.
// Returns null for unsaved tasks (temp_ prefix).
var toTaskSpId = function (id) {
    if (!id || id.startsWith('temp_'))
        return null;
    var parsed = Number(id);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
var TaskPanel = function (_a) {
    var _b, _c, _d, _e, _f, _g, _h, _j, _k;
    var selectedTask = _a.selectedTask, updateTask = _a.updateTask, saveTask = _a.saveTask, deleteTask = _a.deleteTask, onClose = _a.onClose, canAssign = _a.canAssign, context = _a.context, currentUserName = _a.currentUserName, currentUserSpId = _a.currentUserSpId;
    var _l = (0, react_1.useState)(false), isSaving = _l[0], setIsSaving = _l[1];
    var _m = (0, react_1.useState)(null), saveError = _m[0], setSaveError = _m[1];
    var panelRef = (0, react_1.useRef)(null);
    var siteUrl = (_d = (_c = (_b = context === null || context === void 0 ? void 0 : context.pageContext) === null || _b === void 0 ? void 0 : _b.web) === null || _c === void 0 ? void 0 : _c.absoluteUrl) !== null && _d !== void 0 ? _d : (typeof window !== 'undefined' ? window.location.origin : '');
    // Clear the error banner whenever a different task is opened.
    (0, react_1.useEffect)(function () {
        setSaveError(null);
    }, [selectedTask === null || selectedTask === void 0 ? void 0 : selectedTask.id]);
    (0, react_1.useEffect)(function () {
        var handleKey = function (event) {
            if (event.key === 'Escape')
                onClose();
        };
        window.addEventListener('keydown', handleKey);
        return function () { return window.removeEventListener('keydown', handleKey); };
    }, [onClose]);
    if (!selectedTask)
        return null;
    var handleUpdate = function (updates) {
        updateTask(selectedTask.id, updates);
    };
    var handleAssigneeChange = function (user) {
        var _a;
        if (!user) {
            handleUpdate({
                assignedTo: '',
                assignedToId: undefined,
                assignedToEmail: undefined,
                assignedToLoginName: undefined,
            });
            return;
        }
        handleUpdate({
            assignedTo: user.name,
            assignedToId: (_a = user.id) !== null && _a !== void 0 ? _a : undefined,
            assignedToEmail: user.email,
            assignedToLoginName: user.loginName,
        });
    };
    var handleSaveAndClose = function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var saved, err_1;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!selectedTask)
                        return [2 /*return*/];
                    setIsSaving(true);
                    setSaveError(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, saveTask(selectedTask)];
                case 2:
                    saved = _a.sent();
                    if (!saved) {
                        setSaveError('Save may have partially succeeded. Please refresh and verify.');
                        return [2 /*return*/];
                    }
                    onClose();
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _a.sent();
                    console.error('Save failed', err_1);
                    setSaveError('The task could not be saved to SharePoint. Try again.');
                    return [3 /*break*/, 5];
                case 4:
                    setIsSaving(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleDelete = function () {
        deleteTask(selectedTask.id);
        onClose();
    };
    var resolvedAssignee = buildResolvedUserFromTask(selectedTask);
    var taskSpId = toTaskSpId(selectedTask.id);
    return (React.createElement(React.Fragment, null,
        React.createElement("div", { style: overlayStyle, onClick: onClose }),
        React.createElement("div", { ref: panelRef, style: panelStyle },
            React.createElement("div", { style: headerStyle },
                React.createElement("h2", { style: { margin: 0, fontSize: '18px', color: theme_1.THEME.colors.textStrong } }, "Task Details"),
                React.createElement("button", { type: "button", onClick: onClose, "aria-label": "Close", style: {
                        background: 'none',
                        border: 'none',
                        color: theme_1.THEME.colors.textSecondary,
                        fontSize: '24px',
                        cursor: 'pointer',
                        padding: 0,
                        lineHeight: 1,
                    } }, "\u00D7")),
            React.createElement("div", { style: sectionStyle },
                React.createElement("label", { style: labelStyle }, "Title"),
                React.createElement("input", { type: "text", value: selectedTask.title, onChange: function (e) { return handleUpdate({ title: e.target.value }); }, style: inputStyle, placeholder: "Task title" })),
            React.createElement("div", { style: sectionStyle },
                React.createElement("label", { style: labelStyle }, "Assigned To"),
                React.createElement(PeoplePicker_1.default, { value: resolvedAssignee, onChange: handleAssigneeChange, siteUrl: siteUrl, placeholder: "Search by name or email...", canEdit: canAssign })),
            React.createElement("div", { style: sectionStyle },
                React.createElement("label", { style: labelStyle }, "Site"),
                React.createElement("select", { value: (_e = selectedTask.site) !== null && _e !== void 0 ? _e : 'Albertsdal', onChange: function (e) { return handleUpdate({ site: e.target.value }); }, style: inputStyle }, SITES.map(function (s) { return (React.createElement("option", { key: s.value, value: s.value }, s.label)); }))),
            React.createElement("div", { style: sectionStyle },
                React.createElement("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' } },
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle }, "Start Date"),
                        React.createElement("input", { type: "date", value: (_g = (_f = selectedTask.startDate) === null || _f === void 0 ? void 0 : _f.split('T')[0]) !== null && _g !== void 0 ? _g : '', onChange: function (e) { return handleUpdate({ startDate: e.target.value }); }, style: inputStyle })),
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle }, "Due Date"),
                        React.createElement("input", { type: "date", value: (_j = (_h = selectedTask.dueDate) === null || _h === void 0 ? void 0 : _h.split('T')[0]) !== null && _j !== void 0 ? _j : '', onChange: function (e) { return handleUpdate({ dueDate: e.target.value }); }, style: inputStyle })))),
            React.createElement("div", { style: sectionStyle },
                React.createElement("label", { style: labelStyle }, "Priority"),
                React.createElement("select", { value: selectedTask.priority, onChange: function (e) { return handleUpdate({ priority: e.target.value }); }, style: inputStyle },
                    React.createElement("option", { value: "Low" }, "Low"),
                    React.createElement("option", { value: "Medium" }, "Medium"),
                    React.createElement("option", { value: "High" }, "High"))),
            React.createElement("div", { style: sectionStyle },
                React.createElement("label", { style: labelStyle }, "Status"),
                React.createElement("select", { value: selectedTask.status, onChange: function (e) { return handleUpdate({ status: e.target.value }); }, style: inputStyle },
                    React.createElement("option", { value: "Unassigned" }, "Unassigned"),
                    React.createElement("option", { value: "Backlog" }, "Backlog"),
                    React.createElement("option", { value: "ThisWeek" }, "This Week"),
                    React.createElement("option", { value: "InProgress" }, "In Progress"),
                    React.createElement("option", { value: "Completed" }, "Completed"))),
            React.createElement("div", { style: sectionStyle },
                React.createElement("label", { style: labelStyle }, "Description"),
                React.createElement("textarea", { value: (_k = selectedTask.description) !== null && _k !== void 0 ? _k : '', onChange: function (e) { return handleUpdate({ description: e.target.value }); }, style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { minHeight: '100px', resize: 'vertical' }), placeholder: "Add a description..." })),
            React.createElement("div", { style: sectionStyle },
                React.createElement("label", { style: labelStyle }, "Created By"),
                React.createElement("div", { style: { fontSize: '14px', color: theme_1.THEME.colors.textStrong } }, selectedTask.createdBy || currentUserName || 'Unknown')),
            React.createElement("div", { style: { padding: '16px 20px' } },
                React.createElement(CollaborationPanel_1.default, { taskSpId: taskSpId, taskTitle: selectedTask.title, currentUserSpId: currentUserSpId, siteUrl: siteUrl })),
            saveError && (React.createElement("div", { style: {
                    padding: '12px 20px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderTop: "1px solid ".concat(theme_1.THEME.colors.border),
                } },
                React.createElement("span", { style: { color: '#ef4444', fontSize: '13px' } }, saveError))),
            React.createElement("div", { style: {
                    padding: '20px',
                    display: 'flex',
                    gap: '12px',
                    borderTop: "1px solid ".concat(theme_1.THEME.colors.border),
                    marginTop: 'auto',
                } },
                React.createElement("button", { type: "button", onClick: handleSaveAndClose, disabled: isSaving, style: tslib_1.__assign(tslib_1.__assign({}, primaryButtonStyle), { flex: 2, opacity: isSaving ? 0.7 : 1 }) }, isSaving ? 'Saving...' : 'Save & Close'),
                React.createElement("button", { type: "button", onClick: handleDelete, style: tslib_1.__assign(tslib_1.__assign({}, dangerButtonStyle), { flex: 1 }) }, "Delete")))));
};
exports.default = TaskPanel;
//# sourceMappingURL=TaskPanel.js.map