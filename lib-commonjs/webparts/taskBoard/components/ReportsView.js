"use strict";
// ReportsView.tsx
//
// PURPOSE
// -------
// Renders embedded Power BI reports inside the Reports tab.
// Each report is represented by a config object (IPowerBiReport).
// The user picks a report from the tab strip at the top; the selected
// report is embedded in a sandboxed <iframe> using the Power BI embed URL.
//
// HOW POWER BI EMBED URLS WORK
// -----------------------------
// The standard embed URL format is:
//   https://app.powerbi.com/reportEmbed
//     ?reportId=<your-report-guid>
//     &groupId=<your-workspace-guid>    <- optional, but recommended
//     &autoAuth=true                    <- uses the signed-in AAD session
//     &ctid=<your-tenant-id>           <- optional, helps AAD resolve the tenant
//
// You get the reportId and groupId from the Power BI service:
//   Power BI > Workspace > Report > File > Embed report > Website or portal
//
// IMPORTANT: The SharePoint / M365 tenant the web part runs in must have
// access to the Power BI workspace.  If the workspace is "My Workspace"
// (personal), the groupId is omitted.
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = tslib_1.__importStar(require("react"));
var react_1 = require("react");
var theme_1 = require("./theme");
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Builds the Power BI embed URL from a report config.
 *
 * We use `autoAuth=true` so the iframe inherits the user's existing
 * Microsoft 365 / AAD session — no manual token handling required inside
 * a SharePoint context.
 */
var buildEmbedUrl = function (report) {
    var base = 'https://app.powerbi.com/reportEmbed';
    var params = new URLSearchParams({
        reportId: report.reportId,
        autoAuth: 'true',
    });
    if (report.groupId) {
        params.set('groupId', report.groupId);
    }
    if (report.tenantId) {
        params.set('ctid', report.tenantId);
    }
    if (report.pageName) {
        params.set('pageName', report.pageName);
    }
    return "".concat(base, "?").concat(params.toString());
};
// ---------------------------------------------------------------------------
// Empty state — shown when no reports have been configured
// ---------------------------------------------------------------------------
var EmptyState = function () { return (React.createElement("div", { style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '12px',
        color: theme_1.THEME.colors.textSecondary,
    } },
    React.createElement("div", { style: {
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            backgroundColor: theme_1.THEME.colors.primarySoft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '26px',
        } }, "BI"),
    React.createElement("div", { style: { fontWeight: 700, fontSize: '16px', color: theme_1.THEME.colors.textStrong } }, "No reports configured"),
    React.createElement("div", { style: { fontSize: '13px', maxWidth: '340px', textAlign: 'center', lineHeight: 1.6 } },
        "Add at least one ",
        React.createElement("code", null, "IPowerBiReport"),
        " to the ",
        React.createElement("code", null, "POWER_BI_REPORTS"),
        " array in ",
        React.createElement("code", null, "TaskBoard.tsx"),
        " to display reports here."))); };
// ---------------------------------------------------------------------------
// Loading overlay — shown while the iframe is initialising
// ---------------------------------------------------------------------------
var LoadingOverlay = function () { return (React.createElement("div", { style: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme_1.THEME.colors.panel,
        borderRadius: '0 0 12px 12px',
        zIndex: 1,
    } },
    React.createElement("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' } },
        React.createElement("div", { style: {
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: "3px solid ".concat(theme_1.THEME.colors.border),
                borderTopColor: theme_1.THEME.colors.primary,
                animation: 'pbi-spin 700ms linear infinite',
            } }),
        React.createElement("span", { style: { fontSize: '13px', color: theme_1.THEME.colors.textSecondary } }, "Loading report...")),
    React.createElement("style", null, "@keyframes pbi-spin { to { transform: rotate(360deg); } }"))); };
// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
var ReportsView = function (_a) {
    var _b;
    var reports = _a.reports;
    var _c = (0, react_1.useState)(reports.length > 0 ? reports[0].id : ''), selectedReportId = _c[0], setSelectedReportId = _c[1];
    // Track which iframes have finished loading so we can hide the spinner
    var _d = (0, react_1.useState)(new Set()), loadedReportIds = _d[0], setLoadedReportIds = _d[1];
    var _e = (0, react_1.useState)(null), hoveredTabId = _e[0], setHoveredTabId = _e[1];
    var selectedReport = (_b = reports.find(function (r) { return r.id === selectedReportId; })) !== null && _b !== void 0 ? _b : null;
    var handleIframeLoad = function (reportId) {
        setLoadedReportIds(function (prev) {
            var next = new Set(prev);
            next.add(reportId);
            return next;
        });
    };
    if (reports.length === 0) {
        return React.createElement(EmptyState, null);
    }
    return (React.createElement("div", { style: {
            backgroundColor: theme_1.THEME.colors.panel,
            border: "1px solid ".concat(theme_1.THEME.colors.border),
            borderRadius: '16px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
        } },
        React.createElement("div", { style: {
                display: 'flex',
                gap: '4px',
                padding: '12px 16px 0 16px',
                borderBottom: "1px solid ".concat(theme_1.THEME.colors.border),
                backgroundColor: theme_1.THEME.colors.panel,
                flexWrap: 'wrap',
            } }, reports.map(function (report) {
            var isActive = report.id === selectedReportId;
            var isHovered = hoveredTabId === report.id;
            return (React.createElement("button", { key: report.id, type: "button", onClick: function () { return setSelectedReportId(report.id); }, onMouseEnter: function () { return setHoveredTabId(report.id); }, onMouseLeave: function () { return setHoveredTabId(null); }, style: {
                    backgroundColor: isActive
                        ? theme_1.THEME.colors.primary
                        : isHovered
                            ? theme_1.THEME.colors.primarySoft
                            : 'transparent',
                    color: isActive ? '#ffffff' : theme_1.THEME.colors.textPrimary,
                    border: isActive
                        ? "1px solid ".concat(theme_1.THEME.colors.primary)
                        : '1px solid transparent',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    marginBottom: '12px',
                    cursor: 'pointer',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '14px',
                    transition: 'background-color 160ms ease, color 160ms ease',
                } }, report.label));
        })),
        React.createElement("div", { style: { position: 'relative', flexGrow: 1 } }, reports.map(function (report) {
            var isVisible = report.id === selectedReportId;
            var isLoaded = loadedReportIds.has(report.id);
            return (React.createElement("div", { key: report.id, style: {
                    display: isVisible ? 'block' : 'none',
                    position: 'relative',
                } },
                !isLoaded && isVisible && React.createElement(LoadingOverlay, null),
                React.createElement("iframe", { title: report.label, src: buildEmbedUrl(report), onLoad: function () { return handleIframeLoad(report.id); }, style: {
                        width: '100%',
                        height: '760px',
                        border: 'none',
                        display: 'block',
                        // Fade in once loaded to avoid a jarring blank flash
                        opacity: isLoaded ? 1 : 0,
                        transition: 'opacity 300ms ease',
                    }, 
                    // Power BI requires these permissions for its embed to work correctly
                    allow: "fullscreen", sandbox: "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" })));
        })),
        selectedReport && (React.createElement("div", { style: {
                padding: '10px 16px',
                borderTop: "1px solid ".concat(theme_1.THEME.colors.border),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: theme_1.THEME.colors.background,
            } },
            React.createElement("span", { style: { fontSize: '12px', color: theme_1.THEME.colors.textSecondary } }, selectedReport.label),
            React.createElement("a", { href: "https://app.powerbi.com/groups/".concat(selectedReport.groupId || 'me', "/reports/").concat(selectedReport.reportId), target: "_blank", rel: "noopener noreferrer", style: {
                    fontSize: '12px',
                    color: theme_1.THEME.colors.primary,
                    textDecoration: 'none',
                    fontWeight: 600,
                } }, "Open in Power BI")))));
};
exports.default = ReportsView;
//# sourceMappingURL=ReportsView.js.map