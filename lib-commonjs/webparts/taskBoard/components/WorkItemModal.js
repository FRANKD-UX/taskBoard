"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var CollaborationPanel_1 = tslib_1.__importDefault(require("./CollaborationPanel"));
var PeoplePicker_1 = tslib_1.__importDefault(require("./PeoplePicker"));
var incidentSla_1 = require("./incidentSla");
var theme_1 = require("./theme");
var DepartmentService_1 = require("../../../services/DepartmentService");
var SharePointService_1 = require("../services/SharePointService");
var IncidentAssignmentService_1 = require("../../../services/incidents/IncidentAssignmentService");
var IncidentPolicy_1 = require("../../../services/incidents/IncidentPolicy");
var IncidentDepartmentRules_1 = require("../../../services/incidents/IncidentDepartmentRules");
var TEMP_ID_PREFIX = 'temp_';
var TASK_STATUSES = ['Unassigned', 'Backlog', 'ThisWeek', 'InProgress', 'Completed'];
var INCIDENT_STATUSES = ['New', 'Investigating', 'Resolved'];
var SITES = [
    { value: 'Albertsdal', label: 'Albertsdal (Main Office)' },
    { value: 'Troyville', label: 'Troyville (Secondary Office)' },
];
var getTodayIso = function () {
    var now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
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
var getTypeLabel = function (type) { return type === 'incident' ? 'Incident' : 'Task'; };
var getStatusOptions = function (type) {
    return type === 'incident' ? INCIDENT_STATUSES : TASK_STATUSES;
};
var getSeverityBadgeStyle = function (severity) {
    switch (severity) {
        case 'P1': return { backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' };
        case 'P2': return { backgroundColor: '#ffedd5', color: '#c2410c', borderColor: '#fdba74' };
        case 'P3': return { backgroundColor: '#fef3c7', color: '#a16207', borderColor: '#fde68a' };
        case 'P4': return { backgroundColor: '#dbeafe', color: '#1d4ed8', borderColor: '#93c5fd' };
        default: return { backgroundColor: '#f8fafc', color: theme_1.THEME.colors.textSecondary, borderColor: theme_1.THEME.colors.border };
    }
};
// Styles (unchanged)
var overlayStyle = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' };
var modalStyle = { backgroundColor: theme_1.THEME.colors.panel, border: "1px solid ".concat(theme_1.THEME.colors.border), borderRadius: '14px', width: '100%', maxWidth: '560px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 28px 56px rgba(0,0,0,0.15)', overflow: 'hidden' };
var headerStyle = { padding: '20px 24px 16px', borderBottom: "1px solid ".concat(theme_1.THEME.colors.border), display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 };
var bodyStyle = { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto', flex: 1 };
var footerStyle = { padding: '16px 24px', borderTop: "1px solid ".concat(theme_1.THEME.colors.border), display: 'flex', gap: '10px', flexShrink: 0 };
var labelStyle = { display: 'block', fontSize: '11px', fontWeight: 600, color: theme_1.THEME.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' };
var inputStyle = { width: '100%', backgroundColor: theme_1.THEME.colors.background, color: theme_1.THEME.colors.textStrong, border: "1px solid ".concat(theme_1.THEME.colors.border), borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
var gridTwoStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' };
var closeBtnStyle = { background: 'none', border: 'none', color: theme_1.THEME.colors.textSecondary, fontSize: '24px', cursor: 'pointer', lineHeight: 1, padding: '0 4px' };
var primaryBtnStyle = { flex: 2, padding: '11px 16px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', backgroundColor: theme_1.THEME.colors.primary, color: '#ffffff', transition: 'opacity 0.15s' };
var dangerBtnStyle = { flex: 1, padding: '11px 16px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', backgroundColor: '#ef4444', color: '#ffffff' };
var cancelBtnStyle = { flex: 1, padding: '11px 16px', borderRadius: '8px', border: "1px solid ".concat(theme_1.THEME.colors.border), fontWeight: 600, fontSize: '14px', cursor: 'pointer', backgroundColor: 'transparent', color: theme_1.THEME.colors.textPrimary };
var typeBadgeStyle = function (type) { return ({ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, backgroundColor: type === 'incident' ? '#fff7ed' : theme_1.THEME.colors.primarySoft, color: type === 'incident' ? '#9a3412' : '#0369a1' }); };
var severityTagBaseStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: '40px', borderRadius: '8px', border: '1px solid', padding: '0 12px', fontSize: '13px', fontWeight: 700 };
var WorkItemModal = function (_a) {
    var _b, _c, _d, _e, _f, _g, _h, _j, _k;
    var task = _a.task, canAssign = _a.canAssign, siteUrl = _a.siteUrl, context = _a.context, currentUserName = _a.currentUserName, currentUserSpId = _a.currentUserSpId, incidentUserContext = _a.incidentUserContext, onSave = _a.onSave, onDelete = _a.onDelete, onClose = _a.onClose;
    // SharePointService no longer depends on context – uses the centralized getSP() internally
    var sharePointService = (0, react_1.useMemo)(function () { return new SharePointService_1.SharePointService(); }, []);
    var _l = (0, react_1.useState)(null), draft = _l[0], setDraft = _l[1];
    var _m = (0, react_1.useState)(null), assignee = _m[0], setAssignee = _m[1];
    var _o = (0, react_1.useState)(null), selectedIncidentType = _o[0], setSelectedIncidentType = _o[1];
    var _p = (0, react_1.useState)([]), incidentTypes = _p[0], setIncidentTypes = _p[1];
    var _q = (0, react_1.useState)(null), selectedIncidentTypeId = _q[0], setSelectedIncidentTypeId = _q[1];
    var _r = (0, react_1.useState)(''), severity = _r[0], setSeverity = _r[1];
    var _s = (0, react_1.useState)(true), incidentTypesLoading = _s[0], setIncidentTypesLoading = _s[1];
    var _t = (0, react_1.useState)(false), isSaving = _t[0], setIsSaving = _t[1];
    var _u = (0, react_1.useState)(''), saveError = _u[0], setSaveError = _u[1];
    var _v = (0, react_1.useState)(''), titleError = _v[0], setTitleError = _v[1];
    var _w = (0, react_1.useState)(''), incidentTypeError = _w[0], setIncidentTypeError = _w[1];
    var _x = (0, react_1.useState)([]), departments = _x[0], setDepartments = _x[1];
    var _y = (0, react_1.useState)(true), departmentsLoading = _y[0], setDepartmentsLoading = _y[1];
    var titleRef = (0, react_1.useRef)(null);
    var lastTaskIdRef = (0, react_1.useRef)(null);
    var hasFocusedTitleRef = (0, react_1.useRef)(false);
    var isNewItem = Boolean(draft === null || draft === void 0 ? void 0 : draft.id.startsWith(TEMP_ID_PREFIX));
    var isIncidentModal = Boolean(task && (task.requestType === 'Incident' || task.type === 'incident'));
    // Load departments
    (0, react_1.useEffect)(function () {
        var isMounted = true;
        var loadDepartments = function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
            var service, data, normalizedDepartments;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        service = new DepartmentService_1.DepartmentService();
                        return [4 /*yield*/, service.getDepartments()];
                    case 1:
                        data = _a.sent();
                        normalizedDepartments = Array.from(new Set(data.map(function (department) { return (0, IncidentDepartmentRules_1.normalizeDepartment)(department); }))).filter(function (department) { return IncidentDepartmentRules_1.ALLOWED_TASK_DEPARTMENTS.includes(department); });
                        if (isMounted) {
                            setDepartments(normalizedDepartments);
                            setDepartmentsLoading(false);
                        }
                        return [2 /*return*/];
                }
            });
        }); };
        loadDepartments();
        return function () { isMounted = false; };
    }, []);
    // Load incident types when department or modal type changes
    (0, react_1.useEffect)(function () {
        var isMounted = true;
        var loadIncidentTypes = function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
            var department, data, error_1;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!isIncidentModal) {
                            if (isMounted) {
                                setIncidentTypes([]);
                                setIncidentTypesLoading(false);
                            }
                            return [2 /*return*/];
                        }
                        if (!sharePointService) {
                            console.error('WorkItemModal: SharePointService not available');
                            if (isMounted) {
                                setIncidentTypes([]);
                                setIncidentTypesLoading(false);
                            }
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        if (isMounted)
                            setIncidentTypesLoading(true);
                        department = ((draft === null || draft === void 0 ? void 0 : draft.department) || '').trim();
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
                        if (isMounted) {
                            setIncidentTypes(data);
                            if (data.length > 0 && selectedIncidentTypeId == null) {
                                setSelectedIncidentTypeId(data[0].Id);
                            }
                        }
                        return [3 /*break*/, 5];
                    case 3:
                        error_1 = _a.sent();
                        console.error('WorkItemModal: failed to load IncidentTypes', error_1);
                        if (isMounted)
                            setIncidentTypes([]);
                        return [3 /*break*/, 5];
                    case 4:
                        if (isMounted)
                            setIncidentTypesLoading(false);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        }); };
        loadIncidentTypes();
        return function () { isMounted = false; };
    }, [draft === null || draft === void 0 ? void 0 : draft.department, isIncidentModal, sharePointService, selectedIncidentTypeId]);
    // Reset form when task changes
    (0, react_1.useEffect)(function () {
        if (!task) {
            lastTaskIdRef.current = null;
            hasFocusedTitleRef.current = false;
            setDraft(null);
            setAssignee(null);
            setSelectedIncidentType(null);
            setSelectedIncidentTypeId(null);
            setSeverity('');
            return;
        }
        if (lastTaskIdRef.current === task.id) {
            if (currentUserName) {
                setDraft(function (prev) {
                    if (!prev || prev.createdBy)
                        return prev;
                    return tslib_1.__assign(tslib_1.__assign({}, prev), { createdBy: currentUserName });
                });
            }
            return;
        }
        lastTaskIdRef.current = task.id;
        hasFocusedTitleRef.current = false;
        var today = getTodayIso();
        var normalizedType = task.type || (task.requestType === 'Incident' ? 'incident' : 'task');
        var normalizedStatus = task.status || (normalizedType === 'incident' ? 'New' : 'Unassigned');
        var initialIncidentTypeId = normalizedType === 'incident' && task.incidentTypeId ? task.incidentTypeId : null;
        var initialSeverity = normalizedType === 'incident' ? task.severity : '';
        var nextDraft = tslib_1.__assign(tslib_1.__assign({}, task), { type: normalizedType, requestType: toRequestType(normalizedType), status: normalizedStatus, site: task.site || 'Albertsdal', startDate: task.startDate || today, createdAt: task.createdAt || new Date().toISOString(), createdBy: task.createdBy || currentUserName, severity: normalizedType === 'incident' ? task.severity : undefined, impact: normalizedType === 'incident' ? (task.impact || '') : undefined, affectedService: normalizedType === 'incident' ? (task.affectedService || '') : undefined, incidentTypeId: normalizedType === 'incident' ? task.incidentTypeId : undefined, incidentType: null, department: (0, IncidentDepartmentRules_1.normalizeDepartment)(task.department), slaResponseMinutes: task.slaResponseMinutes, slaResolutionMinutes: task.slaResolutionMinutes, slaDeadline: task.slaDeadline, slaStatus: task.slaStatus });
        setDraft(nextDraft);
        setSelectedIncidentType(null);
        setSelectedIncidentTypeId(initialIncidentTypeId);
        setSeverity(initialSeverity);
        setAssignee(buildResolvedUser(task));
        setSaveError('');
        setTitleError('');
        setIncidentTypeError('');
    }, [task, currentUserName]);
    // When incident type selection changes, update draft
    (0, react_1.useEffect)(function () {
        if (!draft || draft.type !== 'incident' || incidentTypes.length === 0 || !selectedIncidentTypeId)
            return;
        var matching = incidentTypes.find(function (item) { return item.Id === selectedIncidentTypeId; }) || null;
        if (!matching)
            return;
        if ((selectedIncidentType === null || selectedIncidentType === void 0 ? void 0 : selectedIncidentType.id) === matching.Id && severity === matching.Severity)
            return;
        setSelectedIncidentType({ id: matching.Id, title: matching.Title, severity: matching.Severity });
        setSeverity(matching.Severity);
        setDraft(function (prev) {
            if (!prev || prev.type !== 'incident')
                return prev;
            return tslib_1.__assign(tslib_1.__assign({}, prev), { incidentTypeId: matching.Id, incidentType: null, severity: matching.Severity, priority: (0, incidentSla_1.getPriorityFromSeverity)(matching.Severity) });
        });
    }, [draft === null || draft === void 0 ? void 0 : draft.type, incidentTypes, selectedIncidentType, selectedIncidentTypeId, severity]);
    // Auto‑focus title for new items
    (0, react_1.useEffect)(function () {
        if (!draft || !isNewItem)
            return;
        if (hasFocusedTitleRef.current)
            return;
        hasFocusedTitleRef.current = true;
        var timer = setTimeout(function () { var _a; return (_a = titleRef.current) === null || _a === void 0 ? void 0 : _a.focus(); }, 60);
        return function () { return clearTimeout(timer); };
    }, [draft === null || draft === void 0 ? void 0 : draft.id, isNewItem]);
    (0, react_1.useEffect)(function () {
        var handleKey = function (event) { if (event.key === 'Escape')
            onClose(); };
        window.addEventListener('keydown', handleKey);
        return function () { return window.removeEventListener('keydown', handleKey); };
    }, [onClose]);
    if (!draft)
        return null;
    var update = function (patch) {
        setDraft(function (prev) {
            if (!prev)
                return prev;
            var nextType = patch.type || prev.type;
            if (patch.department !== undefined && patch.department !== prev.department) {
                setSelectedIncidentType(null);
                setSelectedIncidentTypeId(null);
                setSeverity('');
                return tslib_1.__assign(tslib_1.__assign(tslib_1.__assign({}, prev), patch), { requestType: toRequestType(nextType), incidentTypeId: undefined, incidentType: null, severity: undefined });
            }
            if (patch.department !== undefined) {
                patch.department = (0, IncidentDepartmentRules_1.normalizeDepartment)(patch.department);
            }
            return tslib_1.__assign(tslib_1.__assign(tslib_1.__assign({}, prev), patch), { requestType: toRequestType(nextType) });
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
        setSelectedIncidentTypeId(nextId || null);
        setIncidentTypeError('');
        var nextType = incidentTypes.find(function (item) { return item.Id === nextId; });
        if (nextType) {
            setSeverity(nextType.Severity);
        }
        else {
            setSeverity('');
        }
        update({
            incidentTypeId: nextType === null || nextType === void 0 ? void 0 : nextType.Id,
            incidentType: null,
            severity: nextType === null || nextType === void 0 ? void 0 : nextType.Severity,
            priority: (0, incidentSla_1.getPriorityFromSeverity)(nextType === null || nextType === void 0 ? void 0 : nextType.Severity),
        });
    };
    var handleSave = function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var effectiveIncidentTypeId, selectedIncidentTypeOption, itemToSave, saved, error_2, message;
        var _a, _b, _c, _d, _e;
        return tslib_1.__generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    if (!draft.title.trim()) {
                        setTitleError('Title is required');
                        (_a = titleRef.current) === null || _a === void 0 ? void 0 : _a.focus();
                        return [2 /*return*/];
                    }
                    effectiveIncidentTypeId = selectedIncidentTypeId !== null && selectedIncidentTypeId !== void 0 ? selectedIncidentTypeId : draft.incidentTypeId;
                    if (draft.type === 'incident' && !effectiveIncidentTypeId) {
                        setIncidentTypeError('Incident Type is required');
                        return [2 /*return*/];
                    }
                    if (draft.type === 'incident' && IncidentPolicy_1.IncidentPolicy.requiresSite({
                        department: draft.department,
                        severity: draft.severity,
                        site: draft.site,
                        incidentTypeTitle: (_b = selectedIncidentType === null || selectedIncidentType === void 0 ? void 0 : selectedIncidentType.title) !== null && _b !== void 0 ? _b : undefined,
                    }) && !draft.site) {
                        setSaveError('IT incidents require a site.');
                        return [2 /*return*/];
                    }
                    setIsSaving(true);
                    setSaveError('');
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 3, 4, 5]);
                    selectedIncidentTypeOption = (_c = incidentTypes.find(function (item) { return item.Id === effectiveIncidentTypeId; })) !== null && _c !== void 0 ? _c : null;
                    itemToSave = draft.type === 'incident'
                        ? tslib_1.__assign(tslib_1.__assign({}, draft), { requestType: 'Incident', incidentTypeId: effectiveIncidentTypeId !== null && effectiveIncidentTypeId !== void 0 ? effectiveIncidentTypeId : undefined, incidentType: effectiveIncidentTypeId
                                ? {
                                    id: effectiveIncidentTypeId,
                                    title: (_e = (_d = selectedIncidentTypeOption === null || selectedIncidentTypeOption === void 0 ? void 0 : selectedIncidentTypeOption.Title) !== null && _d !== void 0 ? _d : selectedIncidentType === null || selectedIncidentType === void 0 ? void 0 : selectedIncidentType.title) !== null && _e !== void 0 ? _e : '',
                                    severity: (severity || (selectedIncidentType === null || selectedIncidentType === void 0 ? void 0 : selectedIncidentType.severity) || draft.severity),
                                    department: (0, IncidentDepartmentRules_1.normalizeDepartment)(draft.department),
                                }
                                : null, severity: (severity || (selectedIncidentType === null || selectedIncidentType === void 0 ? void 0 : selectedIncidentType.severity) || draft.severity), impact: (draft.impact || '').trim(), affectedService: (draft.affectedService || '').trim() }) : tslib_1.__assign(tslib_1.__assign({}, draft), { type: 'task', requestType: 'Task', severity: undefined, impact: undefined, affectedService: undefined, incidentTypeId: undefined, incidentType: null });
                    return [4 /*yield*/, onSave(itemToSave)];
                case 2:
                    saved = _f.sent();
                    if (!saved) {
                        setSaveError("Could not save ".concat(draft.type, ". Please verify required fields and assignee selection."));
                        return [2 /*return*/];
                    }
                    onClose();
                    return [3 /*break*/, 5];
                case 3:
                    error_2 = _f.sent();
                    message = error_2 instanceof Error ? error_2.message : "Could not save ".concat(draft.type, " to SharePoint. Please try again.");
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
    var derivedSeverity = severity || (selectedIncidentType === null || selectedIncidentType === void 0 ? void 0 : selectedIncidentType.severity) || draft.severity;
    var severityBadgeStyle = getSeverityBadgeStyle(derivedSeverity);
    var derivedPriority = draft.type === 'incident'
        ? (derivedSeverity ? (0, incidentSla_1.getPriorityFromSeverity)(derivedSeverity) : draft.priority)
        : draft.priority;
    var canClaimCurrentIncident = draft.type === 'incident' &&
        IncidentAssignmentService_1.IncidentAssignmentService.canClaimIncident(incidentUserContext, {
            department: draft.department,
            severity: draft.severity,
            assignedToId: draft.assignedToId,
            incidentType: (_b = selectedIncidentType !== null && selectedIncidentType !== void 0 ? selectedIncidentType : draft.incidentType) !== null && _b !== void 0 ? _b : null,
            site: draft.site,
        });
    var canEditAssignee = draft.type === 'incident'
        ? IncidentAssignmentService_1.IncidentAssignmentService.canAssignIncident(incidentUserContext, {
            department: draft.department,
            severity: draft.severity,
            assignedToId: draft.assignedToId,
            incidentType: (_c = selectedIncidentType !== null && selectedIncidentType !== void 0 ? selectedIncidentType : draft.incidentType) !== null && _c !== void 0 ? _c : null,
            site: draft.site,
        }, (assignee === null || assignee === void 0 ? void 0 : assignee.id) != null ? { id: assignee.id, department: draft.department } : null) || canClaimCurrentIncident
        : canAssign;
    return (React.createElement("div", { style: overlayStyle, onClick: onClose },
        React.createElement("div", { style: modalStyle, onClick: function (e) { return e.stopPropagation(); } },
            React.createElement("div", { style: headerStyle },
                React.createElement("div", null,
                    React.createElement("h2", { style: { margin: 0, fontSize: '17px', fontWeight: 700, color: theme_1.THEME.colors.textStrong } }, isNewItem ? "New ".concat(getTypeLabel(draft.type)) : "".concat(getTypeLabel(draft.type), " Details")),
                    React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' } },
                        React.createElement("span", { style: typeBadgeStyle(draft.type) }, getTypeLabel(draft.type)),
                        !isNewItem && React.createElement("span", { style: { fontSize: '11px', color: theme_1.THEME.colors.textSecondary } },
                            "Created by ",
                            draft.createdBy || currentUserName || 'Unknown'))),
                React.createElement("button", { type: "button", onClick: onClose, "aria-label": "Close", style: closeBtnStyle }, "\u00D7")),
            React.createElement("div", { style: bodyStyle },
                React.createElement("div", null,
                    React.createElement("label", { style: labelStyle, htmlFor: "wim-title" },
                        "Title ",
                        React.createElement("span", { style: { color: '#ef4444' } }, "*")),
                    React.createElement("input", { ref: titleRef, id: "wim-title", type: "text", value: draft.title, onChange: function (e) { return update({ title: e.target.value }); }, placeholder: draft.type === 'incident' ? 'Enter incident title' : 'Enter task title', style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { borderColor: titleError ? '#ef4444' : theme_1.THEME.colors.border }) }),
                    titleError && React.createElement("span", { style: { display: 'block', marginTop: '4px', fontSize: '12px', color: '#ef4444' } }, titleError)),
                canEditAssignee && (React.createElement("div", null,
                    React.createElement("label", { style: labelStyle }, "Assigned To"),
                    React.createElement(PeoplePicker_1.default, { value: assignee, onChange: handleAssigneeChange, placeholder: "Search by name or email...", canEdit: true, siteUrl: siteUrl }),
                    draft.type === 'incident' && canClaimCurrentIncident && currentUserSpId && (React.createElement("button", { type: "button", onClick: function () {
                            return handleAssigneeChange({
                                id: currentUserSpId,
                                name: currentUserName,
                                email: '',
                                loginName: '',
                            });
                        }, style: { marginTop: '8px', background: 'none', border: 'none', color: theme_1.THEME.colors.primary, cursor: 'pointer', fontSize: '12px', padding: 0 } }, "Assign to me")))),
                React.createElement("div", null,
                    React.createElement("label", { style: labelStyle, htmlFor: "wim-site" }, "Site"),
                    React.createElement("select", { id: "wim-site", value: (_d = draft.site) !== null && _d !== void 0 ? _d : 'Albertsdal', onChange: function (e) { return update({ site: e.target.value }); }, style: inputStyle }, SITES.map(function (site) { return React.createElement("option", { key: site.value, value: site.value }, site.label); }))),
                React.createElement("div", { style: gridTwoStyle },
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "wim-status" }, "Status"),
                        React.createElement("select", { id: "wim-status", value: draft.status, onChange: function (e) { return update({ status: e.target.value }); }, style: inputStyle }, statusOptions.map(function (s) { return React.createElement("option", { key: s, value: s }, s); }))),
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "wim-priority" }, "Priority"),
                        draft.type === 'incident' ? (React.createElement("input", { id: "wim-priority", type: "text", value: derivedPriority, readOnly: true, style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { opacity: 0.7, cursor: 'not-allowed' }) })) : (React.createElement("select", { id: "wim-priority", value: draft.priority, onChange: function (e) { return update({ priority: e.target.value }); }, style: inputStyle },
                            React.createElement("option", { value: "Low" }, "Low"),
                            React.createElement("option", { value: "Medium" }, "Medium"),
                            React.createElement("option", { value: "High" }, "High"))))),
                draft.type === 'incident' && (React.createElement(React.Fragment, null,
                    React.createElement("div", { style: gridTwoStyle },
                        React.createElement("div", null,
                            React.createElement("label", { style: labelStyle, htmlFor: "wim-incident-type" },
                                "Incident Type ",
                                React.createElement("span", { style: { color: '#ef4444' } }, "*")),
                            React.createElement("select", { id: "wim-incident-type", value: selectedIncidentTypeId !== null && selectedIncidentTypeId !== void 0 ? selectedIncidentTypeId : '', onChange: handleIncidentTypeChange, disabled: incidentTypesLoading, style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { borderColor: incidentTypeError ? '#ef4444' : theme_1.THEME.colors.border, opacity: incidentTypesLoading ? 0.7 : 1 }) },
                                incidentTypesLoading && React.createElement("option", { value: "" }, "Loading incident types..."),
                                incidentTypes.map(function (incidentType) { return React.createElement("option", { key: incidentType.Id, value: incidentType.Id }, incidentType.Title); })),
                            incidentTypeError && React.createElement("span", { style: { display: 'block', marginTop: '4px', fontSize: '12px', color: '#ef4444' } }, incidentTypeError)),
                        React.createElement("div", null,
                            React.createElement("label", { style: labelStyle }, "Severity"),
                            React.createElement("input", { type: "text", value: derivedSeverity || '', readOnly: true, style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { opacity: 0.7, cursor: 'not-allowed' }) }))),
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "wim-affected-service" }, "Affected Service"),
                        React.createElement("input", { id: "wim-affected-service", type: "text", value: draft.affectedService || '', onChange: function (e) { return update({ affectedService: e.target.value }); }, placeholder: "Email, network, ERP, payroll...", style: inputStyle })),
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "wim-impact" }, "Impact"),
                        React.createElement("textarea", { id: "wim-impact", value: draft.impact || '', onChange: function (e) { return update({ impact: e.target.value }); }, placeholder: "Describe business impact and affected users", rows: 3, style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { resize: 'vertical', minHeight: '80px' }) })))),
                React.createElement("div", { style: gridTwoStyle },
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "wim-start-date" },
                            "Start Date ",
                            isNewItem && React.createElement("span", { style: { marginLeft: '6px', fontSize: '10px', color: theme_1.THEME.colors.primary, textTransform: 'none', fontWeight: 400 } }, "(auto)")),
                        React.createElement("input", { id: "wim-start-date", type: "date", value: (_f = (_e = draft.startDate) === null || _e === void 0 ? void 0 : _e.split('T')[0]) !== null && _f !== void 0 ? _f : '', onChange: function (e) { return update({ startDate: e.target.value }); }, style: isNewItem ? tslib_1.__assign(tslib_1.__assign({}, inputStyle), { opacity: 0.6, cursor: 'not-allowed' }) : inputStyle, readOnly: isNewItem })),
                    React.createElement("div", null,
                        React.createElement("label", { style: labelStyle, htmlFor: "wim-due-date" }, "Due Date"),
                        React.createElement("input", { id: "wim-due-date", type: "date", value: (_h = (_g = draft.dueDate) === null || _g === void 0 ? void 0 : _g.split('T')[0]) !== null && _h !== void 0 ? _h : '', min: (_j = draft.startDate) === null || _j === void 0 ? void 0 : _j.split('T')[0], onChange: function (e) { return update({ dueDate: e.target.value }); }, style: inputStyle }))),
                React.createElement("div", null,
                    React.createElement("label", { style: labelStyle, htmlFor: "wim-department" }, "Department"),
                    React.createElement("select", { id: "wim-department", value: draft.department, onChange: function (e) { return update({ department: (0, IncidentDepartmentRules_1.normalizeDepartment)(e.target.value) }); }, style: inputStyle }, departmentsLoading ? (React.createElement("option", null, "Loading...")) : departments.length === 0 ? (React.createElement("option", null, "No departments")) : (departments.map(function (department) { return React.createElement("option", { key: department, value: department }, department); })))),
                React.createElement("div", null,
                    React.createElement("label", { style: labelStyle, htmlFor: "wim-description" }, "Description"),
                    React.createElement("textarea", { id: "wim-description", value: (_k = draft.description) !== null && _k !== void 0 ? _k : '', onChange: function (e) { return update({ description: e.target.value }); }, placeholder: draft.type === 'incident' ? 'Add incident notes...' : 'Add a description...', rows: 3, style: tslib_1.__assign(tslib_1.__assign({}, inputStyle), { resize: 'vertical', minHeight: '80px' }) })),
                !isNewItem && (React.createElement(CollaborationPanel_1.default, { taskSpId: taskSpId, taskTitle: draft.title, currentUserSpId: currentUserSpId }))),
            saveError && (React.createElement("div", { style: { padding: '10px 24px', backgroundColor: '#fef2f2', borderTop: "1px solid ".concat(theme_1.THEME.colors.border) } },
                React.createElement("span", { style: { color: '#ef4444', fontSize: '13px' } }, saveError))),
            React.createElement("div", { style: footerStyle },
                isNewItem && React.createElement("button", { type: "button", onClick: onClose, style: cancelBtnStyle }, "Cancel"),
                !isNewItem && React.createElement("button", { type: "button", onClick: handleDelete, style: dangerBtnStyle }, "Delete"),
                React.createElement("button", { type: "button", onClick: handleSave, disabled: isSaving, style: tslib_1.__assign(tslib_1.__assign({}, primaryBtnStyle), { opacity: isSaving ? 0.65 : 1 }) }, isSaving ? 'Saving...' : isNewItem ? "Create ".concat(getTypeLabel(draft.type)) : 'Save & Close')))));
};
exports.default = WorkItemModal;
//# sourceMappingURL=WorkItemModal.js.map