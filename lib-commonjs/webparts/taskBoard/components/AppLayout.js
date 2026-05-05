"use strict";
// AppLayout.tsx
//
// CHANGE LOG
// ----------
// - Added 'reports' to PrimaryViewKey so TaskBoard can render the Reports view.
// - Removed isPlaceholder from the 'reports' nav item so it becomes clickable.
// - 'settings' remains a placeholder (still labelled "Soon").
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = tslib_1.__importStar(require("react"));
var BugReportWidget_1 = tslib_1.__importDefault(require("./BugReportWidget"));
var theme_1 = require("./theme");
// 'reports' is now a fully active nav item.
// 'settings' stays as a placeholder until that feature is built.
var NAV_ITEMS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'incidents', label: 'Incidents' },
    { key: 'reports', label: 'Reports' },
    { key: 'settings', label: 'Settings', isPlaceholder: true },
];
var AppLayout = function (_a) {
    var selectedView = _a.selectedView, onSelectView = _a.onSelectView, children = _a.children;
    return (React.createElement("div", { style: {
            display: 'flex',
            minHeight: '100vh',
            width: '100%',
            backgroundColor: theme_1.THEME.colors.background,
        } },
        React.createElement("aside", { style: {
                width: '240px',
                flexShrink: 0,
                backgroundColor: '#0f172a',
                color: '#e2e8f0',
                padding: '28px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                boxSizing: 'border-box',
            } },
            React.createElement("div", null,
                React.createElement("div", { style: { fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8' } }, "Operations"),
                React.createElement("div", { style: { marginTop: '8px', fontSize: '22px', fontWeight: 700, color: '#f8fafc' } }, "Task Board"),
                React.createElement("div", { style: { marginTop: '6px', fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 } }, "Shared workspace for delivery, incidents, and reporting.")),
            React.createElement("nav", { style: { display: 'grid', gap: '8px' } }, NAV_ITEMS.map(function (item) {
                var isActive = item.key === selectedView;
                var isDisabled = item.isPlaceholder === true;
                return (React.createElement("button", { key: item.key, type: "button", disabled: isDisabled, onClick: function () {
                        if (!isDisabled) {
                            // Type narrowing: 'settings' is the only non-PrimaryViewKey
                            // key in NAV_ITEMS and it is always isPlaceholder, so this
                            // cast is safe here.
                            onSelectView(item.key);
                        }
                    }, style: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: isActive ? '1px solid rgba(14,165,233,0.55)' : '1px solid transparent',
                        backgroundColor: isActive ? 'rgba(14,165,233,0.18)' : 'transparent',
                        color: isDisabled ? '#64748b' : '#e2e8f0',
                        cursor: isDisabled ? 'default' : 'pointer',
                        fontSize: '14px',
                        fontWeight: isActive ? 700 : 500,
                        textAlign: 'left',
                    } },
                    React.createElement("span", null, item.label),
                    item.isPlaceholder && (React.createElement("span", { style: { fontSize: '11px', color: '#64748b' } }, "Soon"))));
            }))),
        React.createElement("main", { style: {
                flex: 1,
                minWidth: 0,
                padding: '24px',
                backgroundColor: theme_1.THEME.colors.background,
                boxSizing: 'border-box',
            } }, children),
        React.createElement(BugReportWidget_1.default, null)));
};
exports.default = AppLayout;
//# sourceMappingURL=AppLayout.js.map