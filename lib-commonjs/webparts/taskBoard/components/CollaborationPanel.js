"use strict";
// CollaborationPanel.tsx
//
// Renders the "In Collaboration With" section inside TaskModal / TaskPanel.
//
// What it shows:
//   - Avatar stack of accepted collaborators.
//   - A "Request Collaborator" button that opens the PeoplePicker inline.
//   - A request history list showing Pending and Declined requests
//     so the task owner can see what is in flight and cancel if needed.
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var CollaboratorService_1 = require("../../../services/CollaboratorService");
var PeoplePicker_1 = tslib_1.__importDefault(require("./PeoplePicker"));
var theme_1 = require("./theme");
// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------
var AVATAR_PALETTE = ['#2563eb', '#7c3aed', '#0ea5e9', '#f59e0b', '#22c55e', '#ec4899', '#14b8a6'];
var collaboratorService = new CollaboratorService_1.CollaboratorService();
var getInitials = function (name) {
    if (!name)
        return '?';
    return name
        .split(' ')
        .filter(function (p) { return p.length > 0; })
        .slice(0, 2)
        .map(function (p) { return p[0].toUpperCase(); })
        .join('');
};
var getAvatarColor = function (name) {
    if (!name)
        return '#64748b';
    var hash = name.split('').reduce(function (acc, c) { return acc + c.charCodeAt(0); }, 0);
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};
var formatDate = function (iso) {
    if (!iso)
        return '';
    var d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
var Avatar = function (_a) {
    var collaborator = _a.collaborator, _b = _a.size, size = _b === void 0 ? 30 : _b;
    return (React.createElement("div", { title: "".concat(collaborator.name).concat(collaborator.email ? " \u2014 ".concat(collaborator.email) : ''), style: {
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: getAvatarColor(collaborator.name),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: size * 0.37,
            flexShrink: 0,
            border: '2px solid #ffffff',
            marginLeft: size > 30 ? 0 : -6,
            cursor: 'default',
        } }, getInitials(collaborator.name)));
};
// Shows the status badge (Pending / Accepted / Declined) next to a request.
var StatusBadge = function (_a) {
    var status = _a.status;
    var colorMap = {
        Pending: '#f59e0b',
        Accepted: '#22c55e',
        Declined: '#ef4444',
    };
    return (React.createElement("span", { style: {
            fontSize: '10px',
            fontWeight: 700,
            color: '#ffffff',
            backgroundColor: colorMap[status],
            borderRadius: '999px',
            padding: '2px 8px',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            flexShrink: 0,
        } }, status));
};
// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
var CollaborationPanel = function (_a) {
    var taskSpId = _a.taskSpId, taskTitle = _a.taskTitle, currentUserSpId = _a.currentUserSpId, siteUrl = _a.siteUrl;
    var _b = (0, react_1.useState)([]), requests = _b[0], setRequests = _b[1];
    var _c = (0, react_1.useState)(false), isLoading = _c[0], setIsLoading = _c[1];
    var _d = (0, react_1.useState)(false), isRequesting = _d[0], setIsRequesting = _d[1];
    var _e = (0, react_1.useState)(false), isSending = _e[0], setIsSending = _e[1];
    var _f = (0, react_1.useState)(null), selectedUser = _f[0], setSelectedUser = _f[1];
    var _g = (0, react_1.useState)(''), errorMessage = _g[0], setErrorMessage = _g[1];
    var _h = (0, react_1.useState)(''), successMessage = _h[0], setSuccessMessage = _h[1];
    // -----------------------------------------------------------------------
    // Data loading
    // -----------------------------------------------------------------------
    var loadRequests = (0, react_1.useCallback)(function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var data, error_1;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!taskSpId)
                        return [2 /*return*/];
                    setIsLoading(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, collaboratorService.getRequestsForTask(taskSpId)];
                case 2:
                    data = _a.sent();
                    setRequests(data);
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _a.sent();
                    console.error('CollaborationPanel: failed to load requests', error_1);
                    return [3 /*break*/, 5];
                case 4:
                    setIsLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); }, [taskSpId]);
    (0, react_1.useEffect)(function () {
        loadRequests();
    }, [loadRequests]);
    // -----------------------------------------------------------------------
    // Derived state
    // -----------------------------------------------------------------------
    var acceptedCollaborators = requests.filter(function (r) { return r.status === 'Accepted'; }).map(function (r) { return r.collaborator; });
    var pendingRequests = requests.filter(function (r) { return r.status === 'Pending'; });
    var declinedRequests = requests.filter(function (r) { return r.status === 'Declined'; });
    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------
    var handleSendRequest = function () { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var collaboratorSpId, alreadyPending, alreadyAccepted, error_2;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!selectedUser || !taskSpId || !currentUserSpId)
                        return [2 /*return*/];
                    collaboratorSpId = selectedUser.id;
                    if (!collaboratorSpId || collaboratorSpId <= 0) {
                        setErrorMessage('Could not resolve the selected user to a SharePoint account. Try selecting them again.');
                        return [2 /*return*/];
                    }
                    setErrorMessage('');
                    setSuccessMessage('');
                    setIsSending(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, 6, 7]);
                    return [4 /*yield*/, collaboratorService.pendingRequestExists(taskSpId, collaboratorSpId)];
                case 2:
                    alreadyPending = _a.sent();
                    if (alreadyPending) {
                        setErrorMessage("A pending request was already sent to ".concat(selectedUser.name, "."));
                        return [2 /*return*/];
                    }
                    alreadyAccepted = acceptedCollaborators.some(function (c) { return c.id === collaboratorSpId; });
                    if (alreadyAccepted) {
                        setErrorMessage("".concat(selectedUser.name, " is already collaborating on this task."));
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, collaboratorService.createRequest({
                            taskId: taskSpId,
                            taskTitle: taskTitle,
                            collaboratorId: collaboratorSpId,
                            requestedById: currentUserSpId,
                        })];
                case 3:
                    _a.sent();
                    setSuccessMessage("Collaboration request sent to ".concat(selectedUser.name, ". They will receive an email shortly."));
                    setSelectedUser(null);
                    setIsRequesting(false);
                    // Refresh the list so the new Pending row appears immediately.
                    return [4 /*yield*/, loadRequests()];
                case 4:
                    // Refresh the list so the new Pending row appears immediately.
                    _a.sent();
                    return [3 /*break*/, 7];
                case 5:
                    error_2 = _a.sent();
                    console.error('CollaborationPanel: failed to send request', error_2);
                    setErrorMessage('Failed to send the collaboration request. Please try again.');
                    return [3 /*break*/, 7];
                case 6:
                    setIsSending(false);
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    var handleCancelRequest = function (requestId, collaboratorName) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
        var error_3;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!window.confirm("Cancel the collaboration request sent to ".concat(collaboratorName, "?")))
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, collaboratorService.cancelRequest(requestId)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, loadRequests()];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_3 = _a.sent();
                    console.error('CollaborationPanel: failed to cancel request', error_3);
                    setErrorMessage('Could not cancel the request. Please try again.');
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleToggleRequesting = function () {
        setIsRequesting(function (prev) { return !prev; });
        setSelectedUser(null);
        setErrorMessage('');
        setSuccessMessage('');
    };
    // -----------------------------------------------------------------------
    // Early return — task not yet saved to SharePoint
    // -----------------------------------------------------------------------
    if (!taskSpId) {
        return (React.createElement("div", { style: sectionWrapperStyle },
            React.createElement("div", { style: sectionLabelStyle }, "In Collaboration With"),
            React.createElement("div", { style: { fontSize: '13px', color: theme_1.THEME.colors.textSecondary } }, "Save the task first before adding collaborators.")));
    }
    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (React.createElement("div", { style: sectionWrapperStyle },
        React.createElement("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } },
            React.createElement("div", { style: sectionLabelStyle }, "In Collaboration With"),
            React.createElement("button", { type: "button", onClick: handleToggleRequesting, style: {
                    fontSize: '12px',
                    fontWeight: 600,
                    color: isRequesting ? theme_1.THEME.colors.textSecondary : '#2563eb',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 6px',
                } }, isRequesting ? 'Cancel' : '+ Request Collaborator')),
        isLoading && (React.createElement("div", { style: { fontSize: '13px', color: theme_1.THEME.colors.textSecondary } }, "Loading...")),
        !isLoading && acceptedCollaborators.length > 0 && (React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' } },
            acceptedCollaborators.map(function (collaborator, index) { return (React.createElement("div", { key: collaborator.email || collaborator.name, style: { marginLeft: index === 0 ? 0 : -6 } },
                React.createElement(Avatar, { collaborator: collaborator, size: 32 }))); }),
            React.createElement("span", { style: { marginLeft: '10px', fontSize: '13px', color: theme_1.THEME.colors.textPrimary } }, acceptedCollaborators.map(function (c) { return c.name; }).join(', ')))),
        !isLoading && acceptedCollaborators.length === 0 && !isRequesting && (React.createElement("div", { style: { fontSize: '13px', color: theme_1.THEME.colors.textSecondary, marginBottom: '12px' } }, "No collaborators yet.")),
        isRequesting && (React.createElement("div", { style: requestFormStyle },
            React.createElement("div", { style: { fontSize: '12px', fontWeight: 600, color: theme_1.THEME.colors.textSecondary, marginBottom: '6px' } }, "Search for a person to collaborate with"),
            React.createElement(PeoplePicker_1.default, { value: selectedUser, onChange: setSelectedUser, placeholder: "Search by name or email...", canEdit: true, siteUrl: siteUrl }),
            React.createElement("button", { type: "button", onClick: handleSendRequest, disabled: !selectedUser || isSending, style: {
                    marginTop: '10px',
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: !selectedUser || isSending ? '#94a3b8' : '#2563eb',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: !selectedUser || isSending ? 'not-allowed' : 'pointer',
                    transition: 'background-color 150ms ease',
                } }, isSending ? 'Sending...' : 'Send Collaboration Request'))),
        successMessage && (React.createElement("div", { style: tslib_1.__assign(tslib_1.__assign({}, feedbackStyle), { backgroundColor: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }) }, successMessage)),
        errorMessage && (React.createElement("div", { style: tslib_1.__assign(tslib_1.__assign({}, feedbackStyle), { backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }) }, errorMessage)),
        pendingRequests.length > 0 && (React.createElement("div", { style: { marginTop: '14px' } },
            React.createElement("div", { style: tslib_1.__assign(tslib_1.__assign({}, sectionLabelStyle), { marginBottom: '8px' }) }, "Pending Requests"),
            React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' } }, pendingRequests.map(function (req) { return (React.createElement("div", { key: req.requestId, style: requestRowStyle },
                React.createElement(Avatar, { collaborator: req.collaborator, size: 26 }),
                React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                    React.createElement("div", { style: { fontSize: '13px', fontWeight: 600, color: theme_1.THEME.colors.textPrimary } }, req.collaborator.name),
                    React.createElement("div", { style: { fontSize: '11px', color: theme_1.THEME.colors.textSecondary } },
                        "Requested ",
                        formatDate(req.requestedAt),
                        " by ",
                        req.requestedBy.name)),
                React.createElement(StatusBadge, { status: req.status }),
                req.requestedBy.id === currentUserSpId && (React.createElement("button", { type: "button", onClick: function () { return handleCancelRequest(req.requestId, req.collaborator.name); }, title: "Cancel request", style: cancelButtonStyle }, "\u00D7")))); })))),
        declinedRequests.length > 0 && (React.createElement("details", { style: { marginTop: '14px' } },
            React.createElement("summary", { style: { fontSize: '12px', color: theme_1.THEME.colors.textSecondary, cursor: 'pointer', userSelect: 'none' } },
                declinedRequests.length,
                " declined ",
                declinedRequests.length === 1 ? 'request' : 'requests'),
            React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' } }, declinedRequests.map(function (req) { return (React.createElement("div", { key: req.requestId, style: tslib_1.__assign(tslib_1.__assign({}, requestRowStyle), { opacity: 0.65 }) },
                React.createElement(Avatar, { collaborator: req.collaborator, size: 26 }),
                React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                    React.createElement("div", { style: { fontSize: '13px', fontWeight: 600, color: theme_1.THEME.colors.textPrimary } }, req.collaborator.name),
                    React.createElement("div", { style: { fontSize: '11px', color: theme_1.THEME.colors.textSecondary } },
                        "Declined ",
                        formatDate(req.respondedAt))),
                React.createElement(StatusBadge, { status: req.status }))); }))))));
};
// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
var sectionWrapperStyle = {
    borderTop: "1px solid ".concat(theme_1.THEME.colors.border),
    paddingTop: '16px',
    marginTop: '4px',
};
var sectionLabelStyle = {
    fontSize: '11px',
    fontWeight: 600,
    color: theme_1.THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
};
var requestFormStyle = {
    backgroundColor: '#f8fafc',
    border: "1px solid ".concat(theme_1.THEME.colors.border),
    borderRadius: '10px',
    padding: '12px',
    marginBottom: '10px',
};
var requestRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    backgroundColor: '#f8fafc',
    border: "1px solid ".concat(theme_1.THEME.colors.border),
    borderRadius: '8px',
};
var feedbackStyle = {
    fontSize: '13px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid',
    marginTop: '8px',
};
var cancelButtonStyle = {
    background: 'none',
    border: 'none',
    color: theme_1.THEME.colors.textSecondary,
    fontSize: '18px',
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 2px',
    flexShrink: 0,
};
exports.default = CollaborationPanel;
//# sourceMappingURL=CollaborationPanel.js.map