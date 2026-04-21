"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
// TaskModal.tsx
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var theme_1 = require("./theme");
var PeoplePicker_1 = tslib_1.__importDefault(require("./PeoplePicker"));
var CollaborationPanel_1 = tslib_1.__importDefault(require("./CollaborationPanel"));
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
var TEMP_ID_PREFIX = 'temp_';
var TASK_STATUSES = [
    'Unassigned',
    'Backlog',
    'ThisWeek',
    'InProgress',
    'Completed',
];
// Albertsdal is the main office and listed first so it is the default.
var SITES = [
    { value: 'Albertsdal', label: 'Albertsdal (Main Office)' },
    { value: 'Troyville', label: 'Troyville (Secondary Office)' },
];
var REQUEST_TYPES = ['Task', 'Incident'];
var DEPARTMENTS = ['IT', 'Finance', 'Operations', 'Support'];
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
var getTodayIso = function () {
    var d = new Date();
    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
    ].join('-');
};
var buildResolvedUser = function (task) {
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
// Converts the string task id (used internally) to a numeric SP item ID.
// Returns null for unsaved tasks (temp_ prefix) since they have no SP id yet.
var toTaskSpId = function (id) {
    if (!id || id.startsWith(TEMP_ID_PREFIX))
        return null;
    var parsed = Number(id);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
var overlayStyle = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 1100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
};
var modalStyle = {
    backgroundColor: theme_1.THEME.colors.panel,
    border: "1px solid ".concat(theme_1.THEME.colors.border),
    borderRadius: '14px',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 28px 56px rgba(0,0,0,0.15)',
    overflow: 'hidden',
};
var headerStyle = {
    padding: '20px 24px 16px',
    borderBottom: "1px solid ".concat(theme_1.THEME.colors.border),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
};
var bodyStyle = {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    overflowY: 'auto',
    flex: 1,
};
var footerStyle = {
    padding: '16px 24px',
    borderTop: "1px solid ".concat(theme_1.THEME.colors.border),
    display: 'flex',
    gap: '10px',
    flexShrink: 0,
};
var labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: theme_1.THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    marginBottom: '6px',
};
var inputStyle = {
    width: '100%',
    backgroundColor: theme_1.THEME.colors.background,
    color: theme_1.THEME.colors.textStrong,
    border: "1px solid ".concat(theme_1.THEME.colors.border),
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
};
var gridTwoStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
};
var closeBtnStyle = {
    background: 'none',
    border: 'none',
    color: theme_1.THEME.colors.textSecondary,
    fontSize: '24px',
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 4px',
};
var primaryBtnStyle = {
    flex: 2,
    padding: '11px 16px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    backgroundColor: theme_1.THEME.colors.primary,
    color: '#ffffff',
    transition: 'opacity 0.15s',
};
var dangerBtnStyle = {
    flex: 1,
    padding: '11px 16px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    backgroundColor: '#ef4444',
    color: '#ffffff',
};
var cancelBtnStyle = {
    flex: 1,
    padding: '11px 16px',
    borderRadius: '8px',
    border: "1px solid ".concat(theme_1.THEME.colors.border),
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: theme_1.THEME.colors.textPrimary,
};
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
var TaskModal = function (_a) {
    var _b, _c, _d, _e, _f, _g, _h;
    var task = _a.task, canAssign = _a.canAssign, siteUrl = _a.siteUrl, currentUserName = _a.currentUserName, currentUserSpId = _a.currentUserSpId, onSave = _a.onSave, onDelete = _a.onDelete, onClose = _a.onClose;
    var _j = (0, react_1.useState)(null), draft = _j[0], setDraft = _j[1];
    var _k = (0, react_1.useState)(null), assignee = _k[0], setAssignee = _k[1];
    var _l = (0, react_1.useState)(false), isSaving = _l[0], setIsSaving = _l[1];
    var _m = (0, react_1.useState)(''), saveError = _m[0], setSaveError = _m[1];
    var _o = (0, react_1.useState)(''), titleError = _o[0], setTitleError = _o[1];
    var titleRef = (0, react_1.useRef)(null);
    var isNewTask = Boolean(draft === null || draft === void 0 ? void 0 : draft.id.startsWith(TEMP_ID_PREFIX));
    // Sync draft state when the task prop changes (different task opened).
    (0, react_1.useEffect)(function () {
        if (!task) {
            setDraft(null);
            setAssignee(null);
            return;
        }
        var today = getTodayIso();
        setDraft(tslib_1.__assign(tslib_1.__assign({}, task), { 
            // Guarantee site always has a valid value — handles tasks created
            // before the Site column existed in the SP list.
            site: task.site || 'Albertsdal', startDate: task.startDate || today, createdBy: task.createdBy || currentUserName }));
        setAssignee(buildResolvedUser(task));
        setSaveError('');
        setTitleError('');
    }, [task === null || task === void 0 ? void 0 : task.id, currentUserName]);
    // Auto-focus title when creating a new task.
    (0, react_1.useEffect)(function () {
        if (draft && isNewTask) {
            var timer_1 = setTimeout(function () { var _a; return (_a = titleRef.current) === null || _a === void 0 ? void 0 : _a.focus(); }, 60);
            return function () { return clearTimeout(timer_1); };
        }
    }, [draft === null || draft === void 0 ? void 0 : draft.id, isNewTask]);
    // Close on Escape key.
    (0, react_1.useEffect)(function () {
        var handleKey = function (e) {
            if (e.key === 'Escape')
                onClose();
        };
        window.addEventListener('keydown', handleKey);
        return function () { return window.removeEventListener('keydown', handleKey); };
    }, [onClose]);
    if (!draft)
        return null;
    var update = function (patch) {
        setDraft(function (prev) { return (prev ? tslib_1.__assign(tslib_1.__assign({}, prev), patch) : prev); });
        if ('title' in patch)
            setTitleError('');
    };
    var handleAssigneeChange = function (user) {
        var _a, _b, _c, _d;
        setAssignee(user);
        update({
            assignedTo: (_a = user === null || user === void 0 ? void 0 : user.name) !== null && _a !== void 0 ? _a : '',
            assignedToId: (_b = user === null || user === void 0 ? void 0 : user.id) !== null && _b !== void 0 ? _b : undefined,
            assignedToEmail: (_c = user === null || user === void 0 ? void 0 : user.email) !== null && _c !== void 0 ? _c : undefined,
            assignedToLoginName: (_d = user === null || user === void 0 ? void 0 : user.loginName) !== null && _d !== void 0 ? _d : undefined,
        });
    };
    var handleSave = function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var saved, error_1, message;
        var _a;
        return tslib_1.__generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!draft.title.trim()) {
                        setTitleError('Title is required');
                        (_a = titleRef.current) === null || _a === void 0 ? void 0 : _a.focus();
                        return [2 /*return*/];
                    }
                    setIsSaving(true);
                    setSaveError('');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, onSave(draft)];
                case 2:
                    saved = _b.sent();
                    if (!saved) {
                        setSaveError('Could not save task. Please verify required fields and assignee selection.');
                        return [2 /*return*/];
                    }
                    onClose();
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _b.sent();
                    message = error_1 instanceof Error
                        ? error_1.message
                        : 'Could not save to SharePoint. Please try again.';
                    setSaveError(message);
                    return [3 /*break*/, 5];
                case 4:
                    setIsSaving(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleDelete = function () {
        onDelete(draft.id);
        onClose();
    };
    // The numeric SP item ID — null for new (unsaved) tasks.
    var taskSpId = toTaskSpId(draft.id);
    return (React.createElement("div", { style: overlayStyle, onClick: onClose },
        React.createElement("div", { style: modalStyle, onClick: function (e) { return e.stopPropagation(); } },
            React.createElement("div", { style: headerStyle },
                React.createElement("div", null,
                    React.createElement("h2", { style: { margin: 0, fontSize: '17px', fontWeight: 700, color: theme_1.THEME.colors.textStrong } }, isNewTask ? 'New Task' : 'Task Details'),
                    !isNewTask && (React.createElement("div", { style: { fontSize: '11px', color: theme_1.THEME.colors.textSecondary, marginTop: '2px' } },
                        "Created by ",
                        draft.createdBy || currentUserName || 'Unknown'))),
                React.createElement("button", { type: "button", onClick: onClose, "aria-label": "Close", style: closeBtnStyle }, "\u00D7")),
            React.createElement("div", { style: bodyStyle },
                React.createElement("div", null,
                    React.createElement("label", { style: labelStyle, htmlFor: "tm-title" },
                        "Title ",
                        React.createElement("span", { style: { color: '#ef4444' } }, "*")),
                    React.createElement("input", { ref: titleRef, id: "tm-title", type: "text", value: draft.title, onChange: function (e) { return update({ title: e.target.value }); }, placeholder: "Enter task title", style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { borderColor: titleError ? '#ef4444' : theme_1.THEME.colors.border }) }),
                    titleError && (React.createElement("span", { style: { display: 'block', marginTop: '4px', fontSize: '12px', color: '#ef4444' } }, titleError))),
                canAssign && (React.createElement("div", null,
                    React.createElement("label", { style: labelStyle }, "Assigned To"),
                    React.createElement(PeoplePicker_1.default, { value: assignee, onChange: handleAssigneeChange, placeholder: "Search by name or email...", canEdit: true, siteUrl: siteUrl }))),
                React.createElement("div", null,
                    React.createElement("label", { style: labelStyle, htmlFor: "tm-site" }, "Site"),
                    React.createElement("select", { id: "tm-site", value: (_b = draft.site) !== null && _b !== void 0 ? _b : 'Albertsdal', onChange: function (e) { return update({ site: e.target.value }); }, style: inputStyle }, SITES.map(function (s) { return (React.createElement("option", { key: s.value, value: s.value }, s.label)); }))),
                React.createElement("div", { style: gridTwoStyle },
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "tm-status" }, "Status"),
                        React.createElement("select", { id: "tm-status", value: draft.status, onChange: function (e) { return update({ status: e.target.value }); }, style: inputStyle }, TASK_STATUSES.map(function (s) { return (React.createElement("option", { key: s, value: s }, s)); }))),
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "tm-priority" }, "Priority"),
                        React.createElement("select", { id: "tm-priority", value: draft.priority, onChange: function (e) { return update({ priority: e.target.value }); }, style: inputStyle },
                            React.createElement("option", { value: "Low" }, "Low"),
                            React.createElement("option", { value: "Medium" }, "Medium"),
                            React.createElement("option", { value: "High" }, "High")))),
                React.createElement("div", { style: gridTwoStyle },
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "tm-start-date" },
                            "Start Date",
                            isNewTask && (React.createElement("span", { style: {
                                    marginLeft: '6px',
                                    fontSize: '10px',
                                    color: theme_1.THEME.colors.primary,
                                    textTransform: 'none',
                                    fontWeight: 400,
                                } }, "(auto)"))),
                        React.createElement("input", { id: "tm-start-date", type: "date", value: (_d = (_c = draft.startDate) === null || _c === void 0 ? void 0 : _c.split('T')[0]) !== null && _d !== void 0 ? _d : '', onChange: function (e) { return update({ startDate: e.target.value }); }, style: isNewTask ? tslib_1.__assign(tslib_1.__assign({}, inputStyle), { opacity: 0.6, cursor: 'not-allowed' }) : inputStyle, readOnly: isNewTask })),
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "tm-due-date" }, "Due Date"),
                        React.createElement("input", { id: "tm-due-date", type: "date", value: (_f = (_e = draft.dueDate) === null || _e === void 0 ? void 0 : _e.split('T')[0]) !== null && _f !== void 0 ? _f : '', min: (_g = draft.startDate) === null || _g === void 0 ? void 0 : _g.split('T')[0], onChange: function (e) { return update({ dueDate: e.target.value }); }, style: inputStyle }))),
                React.createElement("div", { style: gridTwoStyle },
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "tm-request-type" }, "Request Type"),
                        React.createElement("select", { id: "tm-request-type", value: draft.requestType, onChange: function (e) { return update({ requestType: e.target.value }); }, style: inputStyle }, REQUEST_TYPES.map(function (rt) { return (React.createElement("option", { key: rt, value: rt }, rt)); }))),
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "tm-department" }, "Department"),
                        React.createElement("select", { id: "tm-department", value: draft.department, onChange: function (e) { return update({ department: e.target.value }); }, style: inputStyle }, DEPARTMENTS.map(function (d) { return (React.createElement("option", { key: d, value: d }, d)); })))),
                React.createElement("div", null,
                    React.createElement("label", { style: labelStyle, htmlFor: "tm-description" }, "Description"),
                    React.createElement("textarea", { id: "tm-description", value: (_h = draft.description) !== null && _h !== void 0 ? _h : '', onChange: function (e) { return update({ description: e.target.value }); }, placeholder: "Add a description...", rows: 3, style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { resize: 'vertical', minHeight: '80px' }) })),
                !isNewTask && (React.createElement(CollaborationPanel_1.default, { taskSpId: taskSpId, taskTitle: draft.title, currentUserSpId: currentUserSpId, siteUrl: siteUrl }))),
            saveError && (React.createElement("div", { style: {
                    padding: '10px 24px',
                    backgroundColor: '#fef2f2',
                    borderTop: "1px solid ".concat(theme_1.THEME.colors.border),
                } },
                React.createElement("span", { style: { color: '#ef4444', fontSize: '13px' } }, saveError))),
            React.createElement("div", { style: footerStyle },
                isNewTask && (React.createElement("button", { type: "button", onClick: onClose, style: cancelBtnStyle }, "Cancel")),
                !isNewTask && (React.createElement("button", { type: "button", onClick: handleDelete, style: dangerBtnStyle }, "Delete")),
                React.createElement("button", { type: "button", onClick: handleSave, disabled: isSaving, style: tslib_1.__assign(tslib_1.__assign({}, primaryBtnStyle), { opacity: isSaving ? 0.65 : 1 }) }, isSaving ? 'Saving...' : isNewTask ? 'Create Task' : 'Save & Close')))));
};
exports.default = TaskModal;
//# sourceMappingURL=TaskModal.js.map