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

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';

import { THEME } from './theme';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPPORT_EMAIL = 'frank.ndlovu@fibrefi.co.za';

const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'] as const;
type SeverityOption = typeof SEVERITY_OPTIONS[number];

const SEVERITY_COLORS: Record<SeverityOption, string> = {
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
const buildMailtoUrl = (
    reporterName: string,
    severity: SeverityOption,
    description: string
): string => {
    const subject = `[Bug Report] ${severity} — Task Board App`;

    const body = [
        'BUG REPORT — Task Board App',
        '─────────────────────────────',
        `Reporter  : ${reporterName || 'Not provided'}`,
        `Severity  : ${severity}`,
        `Date/Time : ${new Date().toLocaleString()}`,
        '',
        'DESCRIPTION',
        '─────────────────────────────',
        description,
        '',
        '─────────────────────────────',
        'Sent via the Task Board in-app bug reporter.',
    ].join('\n');

    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** The collapsed trigger pill shown in the corner at all times. */
const TriggerButton: React.FC<{
    onClick: () => void;
    hasUnread: boolean;
}> = ({ onClick, hasUnread }): React.ReactElement => (
    <button
        type="button"
        onClick={onClick}
        title="Report a bug"
        style={{
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
        }}
        onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 28px rgba(0,0,0,0.28)';
        }}
        onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.22)';
        }}
    >
        {/* Bug icon — inline SVG, no external dependency */}
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <circle cx="8" cy="9" r="4" stroke="#f8fafc" strokeWidth="1.4" />
            <path d="M6 7c0-1.1.9-2 2-2s2 .9 2 2" stroke="#f8fafc" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M5 9H3M13 9h-2" stroke="#f8fafc" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M5.5 6.5L4 5M10.5 6.5L12 5" stroke="#f8fafc" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M6 13l-1.5 1.5M10 13l1.5 1.5" stroke="#f8fafc" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        Report a Bug
        {/* Pulse dot — subtle indicator */}
        {hasUnread && (
            <span
                style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    animation: 'bug-pulse 2s ease-in-out infinite',
                }}
            />
        )}
        <style>{`
            @keyframes bug-pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(1.4); }
            }
        `}</style>
    </button>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const BugReportWidget: React.FC = (): React.ReactElement => {
    const [isOpen, setIsOpen] = useState<boolean>(false);

    // Form state
    const [reporterName, setReporterName] = useState<string>('');
    const [severity, setSeverity] = useState<SeverityOption>('Medium');
    const [description, setDescription] = useState<string>('');
    const [submitted, setSubmitted] = useState<boolean>(false);

    // Close when user clicks outside the panel
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleOutsideClick = (event: MouseEvent): void => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen]);

    // Reset the form back to blank after panel closes (with a delay so the
    // success screen doesn't flicker away before the animation finishes).
    useEffect(() => {
        if (isOpen) return;
        const timer = setTimeout(() => {
            setSubmitted(false);
            setReporterName('');
            setSeverity('Medium');
            setDescription('');
        }, 300);
        return () => clearTimeout(timer);
    }, [isOpen]);

    const handleSubmit = (): void => {
        if (!description.trim()) return;

        const mailto = buildMailtoUrl(reporterName, severity, description);
        window.open(mailto, '_blank');
        setSubmitted(true);
    };

    const isSubmitDisabled = description.trim().length === 0;

    return (
        // Fixed container — positions everything relative to the viewport
        <div
            ref={panelRef}
            style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '10px',
            }}
        >
            {/* ── Expanded panel ── */}
            <div
                style={{
                    width: '340px',
                    backgroundColor: THEME.colors.panel,
                    border: `1px solid ${THEME.colors.border}`,
                    borderRadius: '16px',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.14)',
                    overflow: 'hidden',

                    // Slide + fade animation driven by isOpen
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
                    pointerEvents: isOpen ? 'auto' : 'none',
                    transition: 'opacity 200ms ease, transform 200ms ease',
                    transformOrigin: 'bottom right',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        backgroundColor: '#0f172a',
                        color: '#f8fafc',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700 }}>Report a Bug</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                            Sends directly to the app developer
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        title="Close"
                        style={{
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
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {submitted ? (
                        // ── Success state ──
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '16px 0',
                                textAlign: 'center',
                            }}
                        >
                            <div
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    backgroundColor: THEME.colors.primarySoft,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '22px',
                                }}
                            >
                                {/* Checkmark SVG */}
                                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="11" cy="11" r="10" stroke={THEME.colors.primary} strokeWidth="1.5" />
                                    <path d="M7 11.5l3 3 5-6" stroke={THEME.colors.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div style={{ fontWeight: 700, color: THEME.colors.textStrong, fontSize: '14px' }}>
                                Outlook is opening
                            </div>
                            <div style={{ fontSize: '12px', color: THEME.colors.textSecondary, lineHeight: 1.6 }}>
                                Your bug report is pre-filled and ready to send to{' '}
                                <strong style={{ color: THEME.colors.textPrimary }}>{SUPPORT_EMAIL}</strong>.
                                Just hit Send in Outlook.
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                style={{
                                    marginTop: '4px',
                                    padding: '8px 20px',
                                    backgroundColor: THEME.colors.primary,
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                }}
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        // ── Form state ──
                        <>
                            {/* Recipient info banner */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '8px',
                                    padding: '10px 12px',
                                    backgroundColor: THEME.colors.primarySoft,
                                    border: `1px solid ${THEME.colors.primary}40`,
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    color: THEME.colors.textPrimary,
                                    lineHeight: 1.5,
                                }}
                            >
                                <span style={{ color: THEME.colors.primary, fontSize: '14px', marginTop: '1px' }}>
                                    {/* Info icon */}
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="7" cy="7" r="6" stroke={THEME.colors.primary} strokeWidth="1.3" />
                                        <path d="M7 6v4M7 4.5v.5" stroke={THEME.colors.primary} strokeWidth="1.3" strokeLinecap="round" />
                                    </svg>
                                </span>
                                <span>
                                    Bug reports are sent to{' '}
                                    <strong>{SUPPORT_EMAIL}</strong> via Outlook.
                                    Your default email client will open with the message ready to send.
                                </span>
                            </div>

                            {/* Your name */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label
                                    htmlFor="bug-reporter-name"
                                    style={{ fontSize: '12px', fontWeight: 600, color: THEME.colors.textPrimary }}
                                >
                                    Your name <span style={{ color: THEME.colors.textSecondary, fontWeight: 400 }}>(optional)</span>
                                </label>
                                <input
                                    id="bug-reporter-name"
                                    type="text"
                                    value={reporterName}
                                    onChange={(e) => setReporterName(e.target.value)}
                                    placeholder="e.g. Frank Ndlovu"
                                    style={{
                                        padding: '8px 10px',
                                        borderRadius: '8px',
                                        border: `1px solid ${THEME.colors.border}`,
                                        backgroundColor: THEME.colors.background,
                                        color: THEME.colors.textPrimary,
                                        fontSize: '13px',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            {/* Severity */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: THEME.colors.textPrimary }}>
                                    Severity
                                </span>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {SEVERITY_OPTIONS.map((option) => {
                                        const isSelected = severity === option;
                                        return (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => setSeverity(option)}
                                                style={{
                                                    padding: '5px 12px',
                                                    borderRadius: '999px',
                                                    border: `1px solid ${isSelected ? SEVERITY_COLORS[option] : THEME.colors.border}`,
                                                    backgroundColor: isSelected ? `${SEVERITY_COLORS[option]}18` : 'transparent',
                                                    color: isSelected ? SEVERITY_COLORS[option] : THEME.colors.textSecondary,
                                                    fontSize: '12px',
                                                    fontWeight: isSelected ? 700 : 500,
                                                    cursor: 'pointer',
                                                    transition: 'all 140ms ease',
                                                }}
                                            >
                                                {option}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Description */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label
                                    htmlFor="bug-description"
                                    style={{ fontSize: '12px', fontWeight: 600, color: THEME.colors.textPrimary }}
                                >
                                    What went wrong? <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <textarea
                                    id="bug-description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe the bug — what did you expect to happen, and what actually happened?"
                                    rows={4}
                                    style={{
                                        padding: '8px 10px',
                                        borderRadius: '8px',
                                        border: `1px solid ${description.trim() ? THEME.colors.border : THEME.colors.border}`,
                                        backgroundColor: THEME.colors.background,
                                        color: THEME.colors.textPrimary,
                                        fontSize: '13px',
                                        lineHeight: 1.6,
                                        resize: 'vertical',
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </div>

                            {/* Submit */}
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitDisabled}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    backgroundColor: isSubmitDisabled ? THEME.colors.border : '#0f172a',
                                    color: isSubmitDisabled ? THEME.colors.textSecondary : '#f8fafc',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: isSubmitDisabled ? 'default' : 'pointer',
                                    transition: 'background-color 160ms ease',
                                    letterSpacing: '0.01em',
                                }}
                            >
                                Open in Outlook and Send
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Trigger button ── */}
            <TriggerButton
                onClick={() => setIsOpen((prev) => !prev)}
                hasUnread={!isOpen}
            />
        </div>
    );
};

export default BugReportWidget;