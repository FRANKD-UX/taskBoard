"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
// CreateTaskModal.tsx
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var theme_1 = require("./theme");
var PeoplePicker_1 = tslib_1.__importDefault(require("./PeoplePicker"));
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
var TASK_STATUSES = [
    'Unassigned',
    'Backlog',
    'ThisWeek',
    'InProgress',
    'Completed',
];
var REQUEST_TYPES = ['Task', 'Incident'];
var DEPARTMENTS = ['IT', 'Finance', 'Operations'];
var TEMP_ID_PREFIX = 'temp_';
var getTodayIso = function () {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    return "".concat(year, "-").concat(month, "-").concat(day);
};
// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
var overlayStyle = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
    maxWidth: '520px',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
};
var headerStyle = {
    padding: '20px 24px 16px',
    borderBottom: "1px solid ".concat(theme_1.THEME.colors.border),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
};
var bodyStyle = {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
    maxHeight: '72vh',
};
var footerStyle = {
    padding: '16px 24px',
    borderTop: "1px solid ".concat(theme_1.THEME.colors.border),
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
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
    backgroundColor: '#0f172a',
    color: theme_1.THEME.colors.textStrong,
    border: "1px solid ".concat(theme_1.THEME.colors.border),
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
};
var gridTwoColumnStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
};
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
var CreateTaskModal = function (_a) {
    var defaultStatus = _a.defaultStatus, siteUrl = _a.siteUrl, canAssign = _a.canAssign, onConfirm = _a.onConfirm, onCancel = _a.onCancel;
    var today = getTodayIso();
    var _b = (0, react_1.useState)({
        title: '',
        status: defaultStatus,
        priority: 'Medium',
        startDate: today,
        dueDate: '',
        description: '',
        requestType: 'Task',
        department: 'IT',
    }), form = _b[0], setForm = _b[1];
    var _c = (0, react_1.useState)(null), assignee = _c[0], setAssignee = _c[1];
    var _d = (0, react_1.useState)(''), titleError = _d[0], setTitleError = _d[1];
    var titleRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        var _a;
        (_a = titleRef.current) === null || _a === void 0 ? void 0 : _a.focus();
    }, []);
    (0, react_1.useEffect)(function () {
        var handleKey = function (event) {
            if (event.key === 'Escape')
                onCancel();
        };
        window.addEventListener('keydown', handleKey);
        return function () { return window.removeEventListener('keydown', handleKey); };
    }, [onCancel]);
    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    var handleFieldChange = function (field, value) {
        setForm(function (previous) {
            var _a;
            return (tslib_1.__assign(tslib_1.__assign({}, previous), (_a = {}, _a[field] = value, _a)));
        });
        if (field === 'title')
            setTitleError('');
    };
    var handleConfirm = function () {
        var _a, _b, _c, _d, _e;
        if (!form.title.trim()) {
            setTitleError('Title is required');
            (_a = titleRef.current) === null || _a === void 0 ? void 0 : _a.focus();
            return;
        }
        var draft = {
            id: "".concat(TEMP_ID_PREFIX).concat(Date.now()),
            title: form.title.trim(),
            status: form.status,
            priority: form.priority,
            startDate: form.startDate,
            dueDate: form.dueDate || undefined,
            description: form.description.trim() || undefined,
            requestType: form.requestType,
            department: form.department,
            createdAt: new Date().toISOString(),
            assignedTo: (_b = assignee === null || assignee === void 0 ? void 0 : assignee.name) !== null && _b !== void 0 ? _b : '',
            assignedToId: (_c = assignee === null || assignee === void 0 ? void 0 : assignee.id) !== null && _c !== void 0 ? _c : undefined,
            assignedToEmail: (_d = assignee === null || assignee === void 0 ? void 0 : assignee.email) !== null && _d !== void 0 ? _d : undefined,
            assignedToLoginName: (_e = assignee === null || assignee === void 0 ? void 0 : assignee.loginName) !== null && _e !== void 0 ? _e : undefined,
            createdBy: '',
        };
        onConfirm(draft);
    };
    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (React.createElement("div", { style: overlayStyle, onClick: onCancel },
        React.createElement("div", { style: modalStyle, onClick: function (e) { return e.stopPropagation(); } },
            React.createElement("div", { style: headerStyle },
                React.createElement("h2", { style: { margin: 0, fontSize: '17px', fontWeight: 700, color: theme_1.THEME.colors.textStrong } }, "New Task"),
                React.createElement("button", { type: "button", onClick: onCancel, "aria-label": "Close modal", style: {
                        background: 'none',
                        border: 'none',
                        color: theme_1.THEME.colors.textSecondary,
                        fontSize: '22px',
                        cursor: 'pointer',
                        lineHeight: 1,
                        padding: '2px 6px',
                    } }, "x")),
            React.createElement("div", { style: bodyStyle },
                React.createElement("div", null,
                    React.createElement("label", { style: labelStyle, htmlFor: "ctm-title" },
                        "Title ",
                        React.createElement("span", { style: { color: '#ef4444' } }, "*")),
                    React.createElement("input", { ref: titleRef, id: "ctm-title", type: "text", value: form.title, onChange: function (e) { return handleFieldChange('title', e.target.value); }, placeholder: "Enter task title", style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { borderColor: titleError ? '#ef4444' : theme_1.THEME.colors.border }) }),
                    titleError && (React.createElement("span", { style: { color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' } }, titleError))),
                canAssign && (React.createElement("div", null,
                    React.createElement("label", { style: labelStyle }, "Assigned To"),
                    React.createElement(PeoplePicker_1.default, { value: assignee, onChange: setAssignee, siteUrl: siteUrl, placeholder: "Search by name or email...", canEdit: true }))),
                React.createElement("div", { style: gridTwoColumnStyle },
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "ctm-status" }, "Status"),
                        React.createElement("select", { id: "ctm-status", value: form.status, onChange: function (e) { return handleFieldChange('status', e.target.value); }, style: inputStyle }, TASK_STATUSES.map(function (s) { return (React.createElement("option", { key: s, value: s }, s)); }))),
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "ctm-priority" }, "Priority"),
                        React.createElement("select", { id: "ctm-priority", value: form.priority, onChange: function (e) { return handleFieldChange('priority', e.target.value); }, style: inputStyle },
                            React.createElement("option", { value: "Low" }, "Low"),
                            React.createElement("option", { value: "Medium" }, "Medium"),
                            React.createElement("option", { value: "High" }, "High")))),
                React.createElement("div", { style: gridTwoColumnStyle },
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "ctm-start-date" },
                            "Start Date",
                            React.createElement("span", { style: {
                                    marginLeft: '6px',
                                    fontSize: '10px',
                                    color: '#60a5fa',
                                    textTransform: 'none',
                                    fontWeight: 400,
                                } }, "(auto)")),
                        React.createElement("input", { id: "ctm-start-date", type: "date", value: form.startDate, readOnly: true, style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { opacity: 0.6, cursor: 'not-allowed' }) })),
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "ctm-due-date" }, "Due Date"),
                        React.createElement("input", { id: "ctm-due-date", type: "date", value: form.dueDate, min: form.startDate, onChange: function (e) { return handleFieldChange('dueDate', e.target.value); }, style: inputStyle }))),
                React.createElement("div", { style: gridTwoColumnStyle },
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "ctm-request-type" }, "Request Type"),
                        React.createElement("select", { id: "ctm-request-type", value: form.requestType, onChange: function (e) { return handleFieldChange('requestType', e.target.value); }, style: inputStyle }, REQUEST_TYPES.map(function (rt) { return (React.createElement("option", { key: rt, value: rt }, rt)); }))),
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "ctm-department" }, "Department"),
                        React.createElement("select", { id: "ctm-department", value: form.department, onChange: function (e) { return handleFieldChange('department', e.target.value); }, style: inputStyle }, DEPARTMENTS.map(function (d) { return (React.createElement("option", { key: d, value: d }, d)); })))),
                React.createElement("div", null,
                    React.createElement("label", { style: labelStyle, htmlFor: "ctm-description" }, "Description"),
                    React.createElement("textarea", { id: "ctm-description", value: form.description, onChange: function (e) { return handleFieldChange('description', e.target.value); }, placeholder: "Optional description...", rows: 3, style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }) }))),
            React.createElement("div", { style: footerStyle },
                React.createElement("button", { type: "button", onClick: onCancel, style: {
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: "1px solid ".concat(theme_1.THEME.colors.border),
                        backgroundColor: 'transparent',
                        color: theme_1.THEME.colors.textPrimary,
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                    } }, "Cancel"),
                React.createElement("button", { type: "button", onClick: handleConfirm, style: {
                        padding: '10px 24px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                    } }, "Create Task")))));
};
exports.default = CreateTaskModal;
//# sourceMappingURL=CreateTaskModal.js.map