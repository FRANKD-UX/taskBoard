"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var CollaborationPanel_1 = tslib_1.__importDefault(require("./CollaborationPanel"));
var PeoplePicker_1 = tslib_1.__importDefault(require("./PeoplePicker"));
var theme_1 = require("./theme");
var DepartmentService_1 = require("../../../services/DepartmentService");
var SharePointService_1 = require("../services/SharePointService");
var TEMP_ID_PREFIX = 'temp_';
var TASK_STATUSES = [
    'Unassigned',
    'Backlog',
    'ThisWeek',
    'InProgress',
    'Completed',
];
var INCIDENT_STATUSES = [
    'New',
    'Investigating',
    'Resolved',
];
var SITES = [
    { value: 'Albertsdal', label: 'Albertsdal (Main Office)' },
    { value: 'Troyville', label: 'Troyville (Secondary Office)' },
];
var getTodayIso = function () {
    var now = new Date();
    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
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
var toTaskSpId = function (id) {
    if (!id || id.startsWith(TEMP_ID_PREFIX))
        return null;
    var parsed = Number(id);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
var toRequestType = function (type) {
    return type === 'incident' ? 'Incident' : 'Task';
};
var getTypeLabel = function (type) {
    return type === 'incident' ? 'Incident' : 'Task';
};
var getStatusOptions = function (type) {
    return type === 'incident' ? INCIDENT_STATUSES : TASK_STATUSES;
};
var getSeverityBadgeStyle = function (severity) {
    switch (severity) {
        case 'P1':
            return { backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' };
        case 'P2':
            return { backgroundColor: '#ffedd5', color: '#c2410c', borderColor: '#fdba74' };
        case 'P3':
            return { backgroundColor: '#fef3c7', color: '#a16207', borderColor: '#fde68a' };
        case 'P4':
            return { backgroundColor: '#dbeafe', color: '#1d4ed8', borderColor: '#93c5fd' };
        default:
            return { backgroundColor: '#f8fafc', color: theme_1.THEME.colors.textSecondary, borderColor: theme_1.THEME.colors.border };
    }
};
var getPriorityFromSeverity = function (severity) {
    switch (severity) {
        case 'P1':
            return 'High';
        case 'P2':
            return 'Medium';
        case 'P3':
        case 'P4':
        default:
            return 'Low';
    }
};
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
var typeBadgeStyle = function (type) { return ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    borderRadius: '999px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 700,
    backgroundColor: type === 'incident' ? '#fff7ed' : theme_1.THEME.colors.primarySoft,
    color: type === 'incident' ? '#9a3412' : '#0369a1',
}); };
var severityTagBaseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '40px',
    borderRadius: '8px',
    border: '1px solid',
    padding: '0 12px',
    fontSize: '13px',
    fontWeight: 700,
};
var WorkItemModal = function (_a) {
    var _b, _c, _d, _e, _f, _g, _h, _j;
    var task = _a.task, canAssign = _a.canAssign, siteUrl = _a.siteUrl, context = _a.context, currentUserName = _a.currentUserName, currentUserSpId = _a.currentUserSpId, onSave = _a.onSave, onDelete = _a.onDelete, onClose = _a.onClose;
    var sharePointService = (0, react_1.useMemo)(function () {
        return context ? new SharePointService_1.SharePointService(context) : null;
    }, [context]);
    var _k = (0, react_1.useState)(null), draft = _k[0], setDraft = _k[1];
    var _l = (0, react_1.useState)(null), assignee = _l[0], setAssignee = _l[1];
    var _m = (0, react_1.useState)(null), selectedIncidentType = _m[0], setSelectedIncidentType = _m[1];
    var _o = (0, react_1.useState)([]), incidentTypes = _o[0], setIncidentTypes = _o[1];
    var _p = (0, react_1.useState)(true), incidentTypesLoading = _p[0], setIncidentTypesLoading = _p[1];
    var _q = (0, react_1.useState)(false), isSaving = _q[0], setIsSaving = _q[1];
    var _r = (0, react_1.useState)(''), saveError = _r[0], setSaveError = _r[1];
    var _s = (0, react_1.useState)(''), titleError = _s[0], setTitleError = _s[1];
    var _t = (0, react_1.useState)(''), incidentTypeError = _t[0], setIncidentTypeError = _t[1];
    var _u = (0, react_1.useState)([]), departments = _u[0], setDepartments = _u[1];
    var _v = (0, react_1.useState)(true), departmentsLoading = _v[0], setDepartmentsLoading = _v[1];
    (0, react_1.useEffect)(function () {
        console.log('WorkItemModal: SPFx context available', Boolean(context));
    }, [context]);
    var titleRef = (0, react_1.useRef)(null);
    var lastTaskIdRef = (0, react_1.useRef)(null);
    var hasFocusedTitleRef = (0, react_1.useRef)(false);
    var isNewItem = Boolean(draft === null || draft === void 0 ? void 0 : draft.id.startsWith(TEMP_ID_PREFIX));
    var isIncidentModal = Boolean(task && (task.requestType === 'Incident' || task.type === 'incident'));
    (0, react_1.useEffect)(function () {
        var isMounted = true;
        var loadDepartments = function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
            var service, data;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        service = new DepartmentService_1.DepartmentService();
                        return [4 /*yield*/, service.getDepartments()];
                    case 1:
                        data = _a.sent();
                        if (isMounted) {
                            setDepartments(data);
                            setDepartmentsLoading(false);
                        }
                        return [2 /*return*/];
                }
            });
        }); };
        loadDepartments();
        return function () {
            isMounted = false;
        };
    }, []);
    (0, react_1.useEffect)(function () {
        var isMounted = true;
        var loadIncidentTypes = function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
            var department, data, mappedIncidentTypes, error_1;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('WorkItemModal: requestType value', task === null || task === void 0 ? void 0 : task.requestType, 'type value', task === null || task === void 0 ? void 0 : task.type);
                        if (!isIncidentModal) {
                            if (isMounted) {
                                setIncidentTypes([]);
                                setIncidentTypesLoading(false);
                            }
                            return [2 /*return*/];
                        }
                        if (!sharePointService) {
                            console.error('WorkItemModal: SPFx context is not available for IncidentTypes loading.');
                            if (isMounted) {
                                setIncidentTypes([]);
                                setIncidentTypesLoading(false);
                            }
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        if (isMounted) {
                            setIncidentTypesLoading(true);
                        }
                        department = ((draft === null || draft === void 0 ? void 0 : draft.department) || '').trim();
                        console.log('WorkItemModal: selected department for IncidentTypes', department);
                        if (!department) {
                            if (isMounted) {
                                setIncidentTypes([]);
                                setIncidentTypesLoading(false);
                            }
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, sharePointService.getIncidentTypes(department)];
                    case 2:
                        data = _a.sent();
                        console.log('WorkItemModal: loaded IncidentTypes', data);
                        if (isMounted) {
                            mappedIncidentTypes = data.map(function (item) { return ({
                                id: item.Id,
                                title: item.Title,
                                severity: item.Severity,
                                department: item.Department,
                                isActive: item.IsActive,
                            }); });
                            console.log('WorkItemModal: mapped IncidentTypes', mappedIncidentTypes);
                            setIncidentTypes(mappedIncidentTypes);
                        }
                        return [3 /*break*/, 5];
                    case 3:
                        error_1 = _a.sent();
                        console.error('WorkItemModal: failed to load IncidentTypes', error_1);
                        if (isMounted) {
                            setIncidentTypes([]);
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        if (isMounted) {
                            setIncidentTypesLoading(false);
                        }
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        }); };
        loadIncidentTypes();
        return function () {
            isMounted = false;
        };
    }, [draft === null || draft === void 0 ? void 0 : draft.department, isIncidentModal, sharePointService, task === null || task === void 0 ? void 0 : task.requestType, task === null || task === void 0 ? void 0 : task.type]);
    (0, react_1.useEffect)(function () {
        if (!task) {
            if (lastTaskIdRef.current) {
                console.log('WorkItemModal: clearing draft for closed task', lastTaskIdRef.current);
            }
            lastTaskIdRef.current = null;
            hasFocusedTitleRef.current = false;
            setDraft(function () { return null; });
            setAssignee(null);
            setSelectedIncidentType(null);
            return;
        }
        if (lastTaskIdRef.current === task.id) {
            console.log('WorkItemModal: preserving draft state for task', task.id);
            if (currentUserName) {
                setDraft(function (previous) {
                    if (!previous || previous.createdBy)
                        return previous;
                    console.log('WorkItemModal: setting createdBy without resetting form', currentUserName);
                    return tslib_1.__assign(tslib_1.__assign({}, previous), { createdBy: currentUserName });
                });
            }
            return;
        }
        lastTaskIdRef.current = task.id;
        hasFocusedTitleRef.current = false;
        var today = getTodayIso();
        var normalizedType = task.type || (task.requestType === 'Incident' ? 'incident' : 'task');
        var normalizedStatus = task.status || (normalizedType === 'incident' ? 'New' : 'Unassigned');
        var initialIncidentType = normalizedType === 'incident' ? (task.incidentType || null) : null;
        var nextDraft = tslib_1.__assign(tslib_1.__assign({}, task), { type: normalizedType, requestType: toRequestType(normalizedType), status: normalizedStatus, site: task.site || 'Albertsdal', startDate: task.startDate || today, createdAt: task.createdAt || new Date().toISOString(), createdBy: task.createdBy || currentUserName, severity: normalizedType === 'incident' ? task.severity : undefined, impact: normalizedType === 'incident' ? (task.impact || '') : undefined, affectedService: normalizedType === 'incident' ? (task.affectedService || '') : undefined, incidentTypeId: normalizedType === 'incident' ? task.incidentTypeId : undefined, incidentType: initialIncidentType, department: normalizedType === 'incident' && (initialIncidentType === null || initialIncidentType === void 0 ? void 0 : initialIncidentType.department)
                ? initialIncidentType.department
                : task.department, slaResponseMinutes: task.slaResponseMinutes, slaResolutionMinutes: task.slaResolutionMinutes, slaDeadline: task.slaDeadline, slaStatus: task.slaStatus });
        console.log('WorkItemModal: initializing draft for task', task.id);
        setDraft(function () { return nextDraft; });
        setSelectedIncidentType(initialIncidentType);
        setAssignee(buildResolvedUser(task));
        setSaveError('');
        setTitleError('');
        setIncidentTypeError('');
    }, [task, currentUserName]);
    (0, react_1.useEffect)(function () {
        var _a;
        if (!draft || draft.type !== 'incident' || incidentTypes.length === 0)
            return;
        var matchingIncidentType = draft.incidentTypeId
            ? incidentTypes.find(function (item) { return item.id === draft.incidentTypeId; }) || null
            : ((_a = draft.incidentType) === null || _a === void 0 ? void 0 : _a.id)
                ? incidentTypes.find(function (item) { var _a; return item.id === ((_a = draft.incidentType) === null || _a === void 0 ? void 0 : _a.id); }) || draft.incidentType || null
                : null;
        if (!matchingIncidentType)
            return;
        if ((selectedIncidentType === null || selectedIncidentType === void 0 ? void 0 : selectedIncidentType.id) === matchingIncidentType.id && draft.severity === matchingIncidentType.severity)
            return;
        setSelectedIncidentType(matchingIncidentType);
        setDraft(function (previous) {
            if (!previous || previous.type !== 'incident')
                return previous;
            return tslib_1.__assign(tslib_1.__assign({}, previous), { incidentTypeId: matchingIncidentType.id, incidentType: matchingIncidentType, severity: matchingIncidentType.severity, priority: getPriorityFromSeverity(matchingIncidentType.severity), department: matchingIncidentType.department || previous.department });
        });
    }, [draft, incidentTypes, selectedIncidentType]);
    (0, react_1.useEffect)(function () {
        if (!draft || !isNewItem)
            return;
        if (hasFocusedTitleRef.current)
            return;
        hasFocusedTitleRef.current = true;
        console.log('WorkItemModal: focusing title once for new item', draft.id);
        var timer = setTimeout(function () { var _a; return (_a = titleRef.current) === null || _a === void 0 ? void 0 : _a.focus(); }, 60);
        return function () { return clearTimeout(timer); };
    }, [draft === null || draft === void 0 ? void 0 : draft.id, isNewItem]);
    (0, react_1.useEffect)(function () {
        var handleKey = function (event) {
            if (event.key === 'Escape')
                onClose();
        };
        window.addEventListener('keydown', handleKey);
        return function () { return window.removeEventListener('keydown', handleKey); };
    }, [onClose]);
    if (!draft)
        return null;
    var update = function (patch) {
        console.log('WorkItemModal: updating draft', patch);
        setDraft(function (previous) {
            if (!previous)
                return previous;
            var nextType = patch.type || previous.type;
            return tslib_1.__assign(tslib_1.__assign(tslib_1.__assign({}, previous), patch), { requestType: toRequestType(nextType) });
        });
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
    var handleIncidentTypeChange = function (event) {
        var nextId = Number(event.target.value);
        var nextIncidentType = incidentTypes.find(function (item) { return item.id === nextId; }) || null;
        setSelectedIncidentType(nextIncidentType);
        setIncidentTypeError('');
        update({
            incidentTypeId: nextIncidentType === null || nextIncidentType === void 0 ? void 0 : nextIncidentType.id,
            incidentType: nextIncidentType,
            severity: nextIncidentType === null || nextIncidentType === void 0 ? void 0 : nextIncidentType.severity,
            priority: getPriorityFromSeverity(nextIncidentType === null || nextIncidentType === void 0 ? void 0 : nextIncidentType.severity),
            department: (nextIncidentType === null || nextIncidentType === void 0 ? void 0 : nextIncidentType.department) || draft.department,
        });
    };
    var handleSave = function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var itemToSave, saved, error_2, message;
        var _a;
        return tslib_1.__generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!draft.title.trim()) {
                        setTitleError('Title is required');
                        (_a = titleRef.current) === null || _a === void 0 ? void 0 : _a.focus();
                        return [2 /*return*/];
                    }
                    if (draft.type === 'incident' && !selectedIncidentType) {
                        setIncidentTypeError('Incident Type is required');
                        return [2 /*return*/];
                    }
                    setIsSaving(true);
                    setSaveError('');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, 4, 5]);
                    itemToSave = draft.type === 'incident'
                        ? tslib_1.__assign(tslib_1.__assign({}, draft), { requestType: 'Incident', incidentTypeId: selectedIncidentType === null || selectedIncidentType === void 0 ? void 0 : selectedIncidentType.id, incidentType: selectedIncidentType, severity: selectedIncidentType === null || selectedIncidentType === void 0 ? void 0 : selectedIncidentType.severity, impact: (draft.impact || '').trim(), affectedService: (draft.affectedService || '').trim() }) : tslib_1.__assign(tslib_1.__assign({}, draft), { type: 'task', requestType: 'Task', severity: undefined, impact: undefined, affectedService: undefined, incidentTypeId: undefined, incidentType: null });
                    return [4 /*yield*/, onSave(itemToSave)];
                case 2:
                    saved = _b.sent();
                    if (!saved) {
                        setSaveError("Could not save ".concat(draft.type, ". Please verify required fields and assignee selection."));
                        return [2 /*return*/];
                    }
                    onClose();
                    return [3 /*break*/, 5];
                case 3:
                    error_2 = _b.sent();
                    message = error_2 instanceof Error
                        ? error_2.message
                        : "Could not save ".concat(draft.type, " to SharePoint. Please try again.");
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
    var taskSpId = toTaskSpId(draft.id);
    var statusOptions = getStatusOptions(draft.type);
    var derivedSeverity = (selectedIncidentType === null || selectedIncidentType === void 0 ? void 0 : selectedIncidentType.severity) || draft.severity;
    var severityBadgeStyle = getSeverityBadgeStyle(derivedSeverity);
    var derivedPriority = draft.type === 'incident'
        ? getPriorityFromSeverity(derivedSeverity)
        : draft.priority;
    return (React.createElement("div", { style: overlayStyle, onClick: onClose },
        React.createElement("div", { style: modalStyle, onClick: function (event) { return event.stopPropagation(); } },
            React.createElement("div", { style: headerStyle },
                React.createElement("div", null,
                    React.createElement("h2", { style: { margin: 0, fontSize: '17px', fontWeight: 700, color: theme_1.THEME.colors.textStrong } }, isNewItem ? "New ".concat(getTypeLabel(draft.type)) : "".concat(getTypeLabel(draft.type), " Details")),
                    React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' } },
                        React.createElement("span", { style: typeBadgeStyle(draft.type) }, getTypeLabel(draft.type)),
                        !isNewItem && (React.createElement("span", { style: { fontSize: '11px', color: theme_1.THEME.colors.textSecondary } },
                            "Created by ",
                            draft.createdBy || currentUserName || 'Unknown')))),
                React.createElement("button", { type: "button", onClick: onClose, "aria-label": "Close", style: closeBtnStyle }, "\u00D7")),
            React.createElement("div", { style: bodyStyle },
                React.createElement("div", null,
                    React.createElement("label", { style: labelStyle, htmlFor: "wim-title" },
                        "Title ",
                        React.createElement("span", { style: { color: '#ef4444' } }, "*")),
                    React.createElement("input", { ref: titleRef, id: "wim-title", type: "text", value: draft.title, onChange: function (event) { return update({ title: event.target.value }); }, placeholder: draft.type === 'incident' ? 'Enter incident title' : 'Enter task title', style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { borderColor: titleError ? '#ef4444' : theme_1.THEME.colors.border }) }),
                    titleError && (React.createElement("span", { style: { display: 'block', marginTop: '4px', fontSize: '12px', color: '#ef4444' } }, titleError))),
                canAssign && (React.createElement("div", null,
                    React.createElement("label", { style: labelStyle }, "Assigned To"),
                    React.createElement(PeoplePicker_1.default, { value: assignee, onChange: handleAssigneeChange, placeholder: "Search by name or email...", canEdit: true, siteUrl: siteUrl }))),
                React.createElement("div", null,
                    React.createElement("label", { style: labelStyle, htmlFor: "wim-site" }, "Site"),
                    React.createElement("select", { id: "wim-site", value: (_b = draft.site) !== null && _b !== void 0 ? _b : 'Albertsdal', onChange: function (event) { return update({ site: event.target.value }); }, style: inputStyle }, SITES.map(function (site) { return (React.createElement("option", { key: site.value, value: site.value }, site.label)); }))),
                React.createElement("div", { style: gridTwoStyle },
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "wim-status" }, "Status"),
                        React.createElement("select", { id: "wim-status", value: draft.status, onChange: function (event) { return update({ status: event.target.value }); }, style: inputStyle }, statusOptions.map(function (status) { return (React.createElement("option", { key: status, value: status }, status)); }))),
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "wim-priority" }, "Priority"),
                        draft.type === 'incident' ? (React.createElement("input", { id: "wim-priority", type: "text", value: derivedPriority, readOnly: true, style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { opacity: 0.7, cursor: 'not-allowed' }) })) : (React.createElement("select", { id: "wim-priority", value: draft.priority, onChange: function (event) { return update({ priority: event.target.value }); }, style: inputStyle },
                            React.createElement("option", { value: "Low" }, "Low"),
                            React.createElement("option", { value: "Medium" }, "Medium"),
                            React.createElement("option", { value: "High" }, "High"))))),
                draft.type === 'incident' && (React.createElement(React.Fragment, null,
                    React.createElement("div", { style: gridTwoStyle },
                        React.createElement("div", null,
                            React.createElement("label", { style: labelStyle, htmlFor: "wim-incident-type" },
                                "Incident Type ",
                                React.createElement("span", { style: { color: '#ef4444' } }, "*")),
                            React.createElement("select", { id: "wim-incident-type", value: (_c = selectedIncidentType === null || selectedIncidentType === void 0 ? void 0 : selectedIncidentType.id) !== null && _c !== void 0 ? _c : '', onChange: handleIncidentTypeChange, disabled: incidentTypesLoading, style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { borderColor: incidentTypeError ? '#ef4444' : theme_1.THEME.colors.border, opacity: incidentTypesLoading ? 0.7 : 1 }) },
                                incidentTypesLoading && (React.createElement("option", { value: "" }, "Loading incident types...")),
                                incidentTypes.map(function (incidentType) { return (React.createElement("option", { key: incidentType.id, value: incidentType.id }, incidentType.title)); })),
                            incidentTypeError && (React.createElement("span", { style: { display: 'block', marginTop: '4px', fontSize: '12px', color: '#ef4444' } }, incidentTypeError))),
                        React.createElement("div", null,
                            React.createElement("label", { style: labelStyle }, "Severity"),
                            React.createElement("div", { style: tslib_1.__assign(tslib_1.__assign({}, severityTagBaseStyle), severityBadgeStyle) }, derivedSeverity || 'Select incident type'))),
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "wim-affected-service" }, "Affected Service"),
                        React.createElement("input", { id: "wim-affected-service", type: "text", value: draft.affectedService || '', onChange: function (event) { return update({ affectedService: event.target.value }); }, placeholder: "Email, network, ERP, payroll...", style: inputStyle })),
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "wim-impact" }, "Impact"),
                        React.createElement("textarea", { id: "wim-impact", value: draft.impact || '', onChange: function (event) { return update({ impact: event.target.value }); }, placeholder: "Describe business impact and affected users", rows: 3, style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { resize: 'vertical', minHeight: '80px' }) })))),
                React.createElement("div", { style: gridTwoStyle },
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "wim-start-date" },
                            "Start Date",
                            isNewItem && (React.createElement("span", { style: {
                                    marginLeft: '6px',
                                    fontSize: '10px',
                                    color: theme_1.THEME.colors.primary,
                                    textTransform: 'none',
                                    fontWeight: 400,
                                } }, "(auto)"))),
                        React.createElement("input", { id: "wim-start-date", type: "date", value: (_e = (_d = draft.startDate) === null || _d === void 0 ? void 0 : _d.split('T')[0]) !== null && _e !== void 0 ? _e : '', onChange: function (event) { return update({ startDate: event.target.value }); }, style: isNewItem ? tslib_1.__assign(tslib_1.__assign({}, inputStyle), { opacity: 0.6, cursor: 'not-allowed' }) : inputStyle, readOnly: isNewItem })),
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "wim-due-date" }, "Due Date"),
                        React.createElement("input", { id: "wim-due-date", type: "date", value: (_g = (_f = draft.dueDate) === null || _f === void 0 ? void 0 : _f.split('T')[0]) !== null && _g !== void 0 ? _g : '', min: (_h = draft.startDate) === null || _h === void 0 ? void 0 : _h.split('T')[0], onChange: function (event) { return update({ dueDate: event.target.value }); }, style: inputStyle }))),
                React.createElement("div", null,
                    React.createElement("label", { style: labelStyle, htmlFor: "wim-department" }, "Department"),
                    React.createElement("select", { id: "wim-department", value: draft.department, onChange: function (event) { return update({ department: event.target.value }); }, style: inputStyle }, departmentsLoading ? (React.createElement("option", null, "Loading...")) : departments.length === 0 ? (React.createElement("option", null, "No departments")) : (departments.map(function (department) { return (React.createElement("option", { key: department, value: department }, department)); })))),
                React.createElement("div", null,
                    React.createElement("label", { style: labelStyle, htmlFor: "wim-description" }, "Description"),
                    React.createElement("textarea", { id: "wim-description", value: (_j = draft.description) !== null && _j !== void 0 ? _j : '', onChange: function (event) { return update({ description: event.target.value }); }, placeholder: draft.type === 'incident' ? 'Add incident notes...' : 'Add a description...', rows: 3, style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { resize: 'vertical', minHeight: '80px' }) })),
                !isNewItem && (React.createElement(CollaborationPanel_1.default, { taskSpId: taskSpId, taskTitle: draft.title, currentUserSpId: currentUserSpId, siteUrl: siteUrl }))),
            saveError && (React.createElement("div", { style: {
                    padding: '10px 24px',
                    backgroundColor: '#fef2f2',
                    borderTop: "1px solid ".concat(theme_1.THEME.colors.border),
                } },
                React.createElement("span", { style: { color: '#ef4444', fontSize: '13px' } }, saveError))),
            React.createElement("div", { style: footerStyle },
                isNewItem && (React.createElement("button", { type: "button", onClick: onClose, style: cancelBtnStyle }, "Cancel")),
                !isNewItem && (React.createElement("button", { type: "button", onClick: handleDelete, style: dangerBtnStyle }, "Delete")),
                React.createElement("button", { type: "button", onClick: handleSave, disabled: isSaving, style: tslib_1.__assign(tslib_1.__assign({}, primaryBtnStyle), { opacity: isSaving ? 0.65 : 1 }) }, isSaving ? 'Saving...' : isNewItem ? "Create ".concat(getTypeLabel(draft.type)) : 'Save & Close')))));
};
exports.default = WorkItemModal;
//# sourceMappingURL=WorkItemModal.js.map