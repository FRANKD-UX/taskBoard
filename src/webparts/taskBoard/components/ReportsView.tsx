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

import * as React from 'react';
import { useState } from 'react';

import { THEME } from './theme';

// ---------------------------------------------------------------------------
// Public contract
// ---------------------------------------------------------------------------

export interface IPowerBiReport {
    /** Unique key used as React key and for the tab strip. */
    id: string;

    /** Display name shown in the tab strip. */
    label: string;

    /**
     * Power BI report GUID.
     * Found in: Power BI service > report URL  "…/reports/<reportId>/…"
     */
    reportId: string;

    /**
     * Power BI workspace (group) GUID.
     * Found in: Power BI service > workspace URL "…/groups/<groupId>/…"
     * Leave as empty string for reports in "My Workspace".
     */
    groupId: string;

    /**
     * Azure AD tenant ID.
     * Found in: Azure portal > Azure Active Directory > Overview > Tenant ID.
     * Providing this avoids an extra AAD redirect.
     */
    tenantId?: string;

    /**
     * Optional fallback page name to open.
     * Useful when a report has many pages and you want a specific one to load.
     * Found in: Power BI embed URL parameter "pageName=ReportSection<id>"
     */
    pageName?: string;
}

export interface IReportsViewProps {
    /** Array of reports to display. Order determines tab order. */
    reports: IPowerBiReport[];
}

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
const buildEmbedUrl = (report: IPowerBiReport): string => {
    const base = 'https://app.powerbi.com/reportEmbed';
    const params = new URLSearchParams({
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

    return `${base}?${params.toString()}`;
};

// ---------------------------------------------------------------------------
// Empty state — shown when no reports have been configured
// ---------------------------------------------------------------------------

const EmptyState: React.FC = (): React.ReactElement => (
    <div
        style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            gap: '12px',
            color: THEME.colors.textSecondary,
        }}
    >
        <div
            style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                backgroundColor: THEME.colors.primarySoft,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
            }}
        >
            BI
        </div>
        <div style={{ fontWeight: 700, fontSize: '16px', color: THEME.colors.textStrong }}>
            No reports configured
        </div>
        <div style={{ fontSize: '13px', maxWidth: '340px', textAlign: 'center', lineHeight: 1.6 }}>
            Add at least one <code>IPowerBiReport</code> to the <code>POWER_BI_REPORTS</code> array
            in <code>TaskBoard.tsx</code> to display reports here.
        </div>
    </div>
);

// ---------------------------------------------------------------------------
// Loading overlay — shown while the iframe is initialising
// ---------------------------------------------------------------------------

const LoadingOverlay: React.FC = (): React.ReactElement => (
    <div
        style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: THEME.colors.panel,
            borderRadius: '0 0 12px 12px',
            zIndex: 1,
        }}
    >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div
                style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: `3px solid ${THEME.colors.border}`,
                    borderTopColor: THEME.colors.primary,
                    animation: 'pbi-spin 700ms linear infinite',
                }}
            />
            <span style={{ fontSize: '13px', color: THEME.colors.textSecondary }}>
                Loading report...
            </span>
        </div>

        {/* Keyframe injected once — safe because it is idempotent */}
        <style>{`@keyframes pbi-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ReportsView: React.FC<IReportsViewProps> = ({ reports }): React.ReactElement => {
    const [selectedReportId, setSelectedReportId] = useState<string>(
        reports.length > 0 ? reports[0].id : ''
    );

    // Track which iframes have finished loading so we can hide the spinner
    const [loadedReportIds, setLoadedReportIds] = useState<Set<string>>(new Set());

    const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);

    const selectedReport = reports.find((r) => r.id === selectedReportId) ?? null;

    const handleIframeLoad = (reportId: string): void => {
        setLoadedReportIds((prev) => {
            const next = new Set(prev);
            next.add(reportId);
            return next;
        });
    };

    if (reports.length === 0) {
        return <EmptyState />;
    }

    return (
        <div
            style={{
                backgroundColor: THEME.colors.panel,
                border: `1px solid ${THEME.colors.border}`,
                borderRadius: '16px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* ── Report tab strip ── */}
            <div
                style={{
                    display: 'flex',
                    gap: '4px',
                    padding: '12px 16px 0 16px',
                    borderBottom: `1px solid ${THEME.colors.border}`,
                    backgroundColor: THEME.colors.panel,
                    flexWrap: 'wrap',
                }}
            >
                {reports.map((report) => {
                    const isActive = report.id === selectedReportId;
                    const isHovered = hoveredTabId === report.id;

                    return (
                        <button
                            key={report.id}
                            type="button"
                            onClick={() => setSelectedReportId(report.id)}
                            onMouseEnter={() => setHoveredTabId(report.id)}
                            onMouseLeave={() => setHoveredTabId(null)}
                            style={{
                                backgroundColor: isActive
                                    ? THEME.colors.primary
                                    : isHovered
                                    ? THEME.colors.primarySoft
                                    : 'transparent',
                                color: isActive ? '#ffffff' : THEME.colors.textPrimary,
                                border: isActive
                                    ? `1px solid ${THEME.colors.primary}`
                                    : '1px solid transparent',
                                borderRadius: '8px',
                                padding: '8px 14px',
                                marginBottom: '12px',
                                cursor: 'pointer',
                                fontWeight: isActive ? 700 : 500,
                                fontSize: '14px',
                                transition: 'background-color 160ms ease, color 160ms ease',
                            }}
                        >
                            {report.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Embed area ── */}
            {/*
             * We render ALL iframes in the DOM simultaneously (display:none for
             * inactive ones).  This avoids a full reload every time the user
             * switches tabs — the browser keeps the authenticated session alive
             * inside the iframe between switches.
             */}
            <div style={{ position: 'relative', flexGrow: 1 }}>
                {reports.map((report) => {
                    const isVisible = report.id === selectedReportId;
                    const isLoaded = loadedReportIds.has(report.id);

                    return (
                        <div
                            key={report.id}
                            style={{
                                display: isVisible ? 'block' : 'none',
                                position: 'relative',
                            }}
                        >
                            {/* Loading spinner — hidden once iframe fires onLoad */}
                            {!isLoaded && isVisible && <LoadingOverlay />}

                            <iframe
                                title={report.label}
                                src={buildEmbedUrl(report)}
                                onLoad={() => handleIframeLoad(report.id)}
                                style={{
                                    width: '100%',
                                    height: '760px',
                                    border: 'none',
                                    display: 'block',
                                    // Fade in once loaded to avoid a jarring blank flash
                                    opacity: isLoaded ? 1 : 0,
                                    transition: 'opacity 300ms ease',
                                }}
                                // Power BI requires these permissions for its embed to work correctly
                                allow="fullscreen"
                                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                            />
                        </div>
                    );
                })}
            </div>

            {/* ── Footer: direct link to Power BI service ── */}
            {selectedReport && (
                <div
                    style={{
                        padding: '10px 16px',
                        borderTop: `1px solid ${THEME.colors.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: THEME.colors.background,
                    }}
                >
                    <span style={{ fontSize: '12px', color: THEME.colors.textSecondary }}>
                        {selectedReport.label}
                    </span>
                    <a
                        href={`https://app.powerbi.com/groups/${selectedReport.groupId || 'me'}/reports/${selectedReport.reportId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            fontSize: '12px',
                            color: THEME.colors.primary,
                            textDecoration: 'none',
                            fontWeight: 600,
                        }}
                    >
                        Open in Power BI
                    </a>
                </div>
            )}
        </div>
    );
};

export default ReportsView;
