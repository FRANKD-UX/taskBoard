"use strict";
// BugReportWidget.tsx
//
// PURPOSE
// -------
// A fixed, floating "Report a Bug" widget that lives in the bottom-right
// corner of the screen on every page of the app.
//
// HOW IT SENDS THE EMAIL
// ----------------------
// We use the browser's native `mailto:` protocol.  When the user submits,
// we build a mailto link pre-filled with the subject, severity, description,
// and reporter name, then open it with window.open().
//
// This means:
//   - No backend / API needed — works inside SharePoint with zero config.
//   - The user's default email client (Outlook) opens with the message ready.
//   - The email lands directly in frank.ndlovu@fibrefi.co.za.
//
// MOUNTING
// --------
// Render <BugReportWidget /> once in AppLayout.tsx, outside <main>.
// Because it uses `position: fixed`, it floats above all content regardless
// of which view is active.
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var theme_1 = require("./theme");
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
var SUPPORT_EMAIL = 'frank.ndlovu@fibrefi.co.za';
var SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
var SEVERITY_COLORS = {
    Low: '#22c55e',
    Medium: '#f59e0b',
    High: '#ef4444',
    Critical: '#7c2d12',
};
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Builds a mailto: URL with subject and body pre-filled.
 * We encode the body so Outlook / Gmail render it correctly.
 */
var buildMailtoUrl = function (reporterName, severity, description) {
    var subject = "[Bug Report] ".concat(severity, " \u2014 Task Board App");
    var body = [
        'BUG REPORT — Task Board App',
        '─────────────────────────────',
        "Reporter  : ".concat(reporterName || 'Not provided'),
        "Severity  : ".concat(severity),
        "Date/Time : ".concat(new Date().toLocaleString()),
        '',
        'DESCRIPTION',
        '─────────────────────────────',
        description,
        '',
        '─────────────────────────────',
        'Sent via the Task Board in-app bug reporter.',
    ].join('\n');
    return "mailto:".concat(SUPPORT_EMAIL, "?subject=").concat(encodeURIComponent(subject), "&body=").concat(encodeURIComponent(body));
};
// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
/** The collapsed trigger pill shown in the corner at all times. */
var TriggerButton = function (_a) {
    var onClick = _a.onClick, hasUnread = _a.hasUnread;
    return (React.createElement("button", { type: "button", onClick: onClick, title: "Report a bug", style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '999px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
            transition: 'transform 160ms ease, box-shadow 160ms ease',
            letterSpacing: '0.01em',
            position: 'relative',
        }, onMouseEnter: function (e) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.28)';
        }, onMouseLeave: function (e) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.22)';
        } },
        React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": "true" },
            React.createElement("circle", { cx: "8", cy: "9", r: "4", stroke: "#f8fafc", strokeWidth: "1.4" }),
            React.createElement("path", { d: "M6 7c0-1.1.9-2 2-2s2 .9 2 2", stroke: "#f8fafc", strokeWidth: "1.4", strokeLinecap: "round" }),
            React.createElement("path", { d: "M5 9H3M13 9h-2", stroke: "#f8fafc", strokeWidth: "1.4", strokeLinecap: "round" }),
            React.createElement("path", { d: "M5.5 6.5L4 5M10.5 6.5L12 5", stroke: "#f8fafc", strokeWidth: "1.4", strokeLinecap: "round" }),
            React.createElement("path", { d: "M6 13l-1.5 1.5M10 13l1.5 1.5", stroke: "#f8fafc", strokeWidth: "1.4", strokeLinecap: "round" })),
        "Report a Bug",
        hasUnread && (React.createElement("span", { style: {
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                animation: 'bug-pulse 2s ease-in-out infinite',
            } })),
        React.createElement("style", null, "\n            @keyframes bug-pulse {\n                0%, 100% { opacity: 1; transform: scale(1); }\n                50% { opacity: 0.5; transform: scale(1.4); }\n            }\n        ")));
};
// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
var BugReportWidget = function () {
    var _a = (0, react_1.useState)(false), isOpen = _a[0], setIsOpen = _a[1];
    // Form state
    var _b = (0, react_1.useState)(''), reporterName = _b[0], setReporterName = _b[1];
    var _c = (0, react_1.useState)('Medium'), severity = _c[0], setSeverity = _c[1];
    var _d = (0, react_1.useState)(''), description = _d[0], setDescription = _d[1];
    var _e = (0, react_1.useState)(false), submitted = _e[0], setSubmitted = _e[1];
    // Close when user clicks outside the panel
    var panelRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        if (!isOpen)
            return;
        var handleOutsideClick = function (event) {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return function () { return document.removeEventListener('mousedown', handleOutsideClick); };
    }, [isOpen]);
    // Reset the form back to blank after panel closes (with a delay so the
    // success screen doesn't flicker away before the animation finishes).
    (0, react_1.useEffect)(function () {
        if (isOpen)
            return;
        var timer = setTimeout(function () {
            setSubmitted(false);
            setReporterName('');
            setSeverity('Medium');
            setDescription('');
        }, 300);
        return function () { return clearTimeout(timer); };
    }, [isOpen]);
    var handleSubmit = function () {
        if (!description.trim())
            return;
        var mailto = buildMailtoUrl(reporterName, severity, description);
        window.open(mailto, '_blank');
        setSubmitted(true);
    };
    var isSubmitDisabled = description.trim().length === 0;
    return (
    // Fixed container — positions everything relative to the viewport
    React.createElement("div", { ref: panelRef, style: {
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '10px',
        } },
        React.createElement("div", { style: {
                width: '340px',
                backgroundColor: theme_1.THEME.colors.panel,
                border: "1px solid ".concat(theme_1.THEME.colors.border),
                borderRadius: '16px',
                boxShadow: '0 16px 48px rgba(0,0,0,0.14)',
                overflow: 'hidden',
                // Slide + fade animation driven by isOpen
                opacity: isOpen ? 1 : 0,
                transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
                pointerEvents: isOpen ? 'auto' : 'none',
                transition: 'opacity 200ms ease, transform 200ms ease',
                transformOrigin: 'bottom right',
            } },
            React.createElement("div", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                } },
                React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
                    React.createElement("span", { style: { fontSize: '14px', fontWeight: 700 } }, "Report a Bug"),
                    React.createElement("span", { style: { fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 } }, "Sends directly to the app developer")),
                React.createElement("button", { type: "button", onClick: function () { return setIsOpen(false); }, title: "Close", style: {
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '18px',
                        lineHeight: 1,
                        padding: '4px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                    } }, "\u00D7")),
            React.createElement("div", { style: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' } }, submitted ? (
            // ── Success state ──
            React.createElement("div", { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '16px 0',
                    textAlign: 'center',
                } },
                React.createElement("div", { style: {
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: theme_1.THEME.colors.primarySoft,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                    } },
                    React.createElement("svg", { width: "22", height: "22", viewBox: "0 0 22 22", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
                        React.createElement("circle", { cx: "11", cy: "11", r: "10", stroke: theme_1.THEME.colors.primary, strokeWidth: "1.5" }),
                        React.createElement("path", { d: "M7 11.5l3 3 5-6", stroke: theme_1.THEME.colors.primary, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }))),
                React.createElement("div", { style: { fontWeight: 700, color: theme_1.THEME.colors.textStrong, fontSize: '14px' } }, "Outlook is opening"),
                React.createElement("div", { style: { fontSize: '12px', color: theme_1.THEME.colors.textSecondary, lineHeight: 1.6 } },
                    "Your bug report is pre-filled and ready to send to",
                    ' ',
                    React.createElement("strong", { style: { color: theme_1.THEME.colors.textPrimary } }, SUPPORT_EMAIL),
                    ". Just hit Send in Outlook."),
                React.createElement("button", { type: "button", onClick: function () { return setIsOpen(false); }, style: {
                        marginTop: '4px',
                        padding: '8px 20px',
                        backgroundColor: theme_1.THEME.colors.primary,
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                    } }, "Done"))) : (
            // ── Form state ──
            React.createElement(React.Fragment, null,
                React.createElement("div", { style: {
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        padding: '10px 12px',
                        backgroundColor: theme_1.THEME.colors.primarySoft,
                        border: "1px solid ".concat(theme_1.THEME.colors.primary, "40"),
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: theme_1.THEME.colors.textPrimary,
                        lineHeight: 1.5,
                    } },
                    React.createElement("span", { style: { color: theme_1.THEME.colors.primary, fontSize: '14px', marginTop: '1px' } },
                        React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
                            React.createElement("circle", { cx: "7", cy: "7", r: "6", stroke: theme_1.THEME.colors.primary, strokeWidth: "1.3" }),
                            React.createElement("path", { d: "M7 6v4M7 4.5v.5", stroke: theme_1.THEME.colors.primary, strokeWidth: "1.3", strokeLinecap: "round" }))),
                    React.createElement("span", null,
                        "Bug reports are sent to",
                        ' ',
                        React.createElement("strong", null, SUPPORT_EMAIL),
                        " via Outlook. Your default email client will open with the message ready to send.")),
                React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                    React.createElement("label", { htmlFor: "bug-reporter-name", style: { fontSize: '12px', fontWeight: 600, color: theme_1.THEME.colors.textPrimary } },
                        "Your name ",
                        React.createElement("span", { style: { color: theme_1.THEME.colors.textSecondary, fontWeight: 400 } }, "(optional)")),
                    React.createElement("input", { id: "bug-reporter-name", type: "text", value: reporterName, onChange: function (e) { return setReporterName(e.target.value); }, placeholder: "e.g. Frank Ndlovu", style: {
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: "1px solid ".concat(theme_1.THEME.colors.border),
                            backgroundColor: theme_1.THEME.colors.background,
                            color: theme_1.THEME.colors.textPrimary,
                            fontSize: '13px',
                            outline: 'none',
                        } })),
                React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                    React.createElement("span", { style: { fontSize: '12px', fontWeight: 600, color: theme_1.THEME.colors.textPrimary } }, "Severity"),
                    React.createElement("div", { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, SEVERITY_OPTIONS.map(function (option) {
                        var isSelected = severity === option;
                        return (React.createElement("button", { key: option, type: "button", onClick: function () { return setSeverity(option); }, style: {
                                padding: '5px 12px',
                                borderRadius: '999px',
                                border: "1px solid ".concat(isSelected ? SEVERITY_COLORS[option] : theme_1.THEME.colors.border),
                                backgroundColor: isSelected ? "".concat(SEVERITY_COLORS[option], "18") : 'transparent',
                                color: isSelected ? SEVERITY_COLORS[option] : theme_1.THEME.colors.textSecondary,
                                fontSize: '12px',
                                fontWeight: isSelected ? 700 : 500,
                                cursor: 'pointer',
                                transition: 'all 140ms ease',
                            } }, option));
                    }))),
                React.createElement("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                    React.createElement("label", { htmlFor: "bug-description", style: { fontSize: '12px', fontWeight: 600, color: theme_1.THEME.colors.textPrimary } },
                        "What went wrong? ",
                        React.createElement("span", { style: { color: '#ef4444' } }, "*")),
                    React.createElement("textarea", { id: "bug-description", value: description, onChange: function (e) { return setDescription(e.target.value); }, placeholder: "Describe the bug \u2014 what did you expect to happen, and what actually happened?", rows: 4, style: {
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: "1px solid ".concat(description.trim() ? theme_1.THEME.colors.border : theme_1.THEME.colors.border),
                            backgroundColor: theme_1.THEME.colors.background,
                            color: theme_1.THEME.colors.textPrimary,
                            fontSize: '13px',
                            lineHeight: 1.6,
                            resize: 'vertical',
                            outline: 'none',
                            fontFamily: 'inherit',
                        } })),
                React.createElement("button", { type: "button", onClick: handleSubmit, disabled: isSubmitDisabled, style: {
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: isSubmitDisabled ? theme_1.THEME.colors.border : '#0f172a',
                        color: isSubmitDisabled ? theme_1.THEME.colors.textSecondary : '#f8fafc',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: isSubmitDisabled ? 'default' : 'pointer',
                        transition: 'background-color 160ms ease',
                        letterSpacing: '0.01em',
                    } }, "Open in Outlook and Send"))))),
        React.createElement(TriggerButton, { onClick: function () { return setIsOpen(function (prev) { return !prev; }); }, hasUnread: !isOpen })));
};
exports.default = BugReportWidget;
//# sourceMappingURL=BugReportWidget.js.map