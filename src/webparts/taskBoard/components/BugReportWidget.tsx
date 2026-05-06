// BugReportWidget.tsx
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { AadHttpClient } from '@microsoft/sp-http';
import type { WebPartContext } from '@microsoft/sp-webpart-base';

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

const getSpfxContext = (): WebPartContext | undefined => {
    if (typeof window === 'undefined') return undefined;
    const withContext = window as Window & { spfxContext?: WebPartContext };
    return withContext.spfxContext;
};

const sendEmailViaGraph = async (
    reporterName: string,
    severity: SeverityOption,
    description: string
): Promise<void> => {
    const context = getSpfxContext();
    if (!context) {
        throw new Error('SPFx context not available – cannot send email.');
    }

    const client = await context.aadHttpClientFactory.getClient(
        'https://graph.microsoft.com'
    );

    const subject = `[Bug Report] ${severity} — Task Board App`;
    const bodyHtml = [
        '<h3>BUG REPORT — Task Board App</h3>',
        '<table style="border-collapse:collapse;">',
        `<tr><td style="padding:4px 12px;"><strong>Reporter</strong></td><td>${reporterName || 'Not provided'}</td></tr>`,
        `<tr><td style="padding:4px 12px;"><strong>Severity</strong></td><td>${severity}</td></tr>`,
        `<tr><td style="padding:4px 12px;"><strong>Date/Time</strong></td><td>${new Date().toLocaleString()}</td></tr>`,
        '</table>',
        '<hr/>',
        '<h4>Description</h4>',
        `<p>${description.replace(/\n/g, '<br/>')}</p>`,
        '<hr/>',
        '<small>Sent via the Task Board in-app bug reporter.</small>',
    ].join('\n');

    const message = {
        message: {
            subject,
            body: {
                contentType: 'HTML',
                content: bodyHtml,
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: SUPPORT_EMAIL,
                    },
                },
            ],
        },
        saveToSentItems: 'false',
    };

    await client.post(
        'https://graph.microsoft.com/v1.0/me/sendMail',
        AadHttpClient.configurations.v1,
        {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message),
        }
    );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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
    const [reporterName, setReporterName] = useState<string>('');
    const [severity, setSeverity] = useState<SeverityOption>('Medium');
    const [description, setDescription] = useState<string>('');
    const [isSending, setIsSending] = useState<boolean>(false);
    const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');

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

    // Reset form when closed
    useEffect(() => {
        if (isOpen) return;
        const timer = setTimeout(() => {
            setSendStatus('idle');
            setReporterName('');
            setSeverity('Medium');
            setDescription('');
            setErrorMessage('');
        }, 300);
        return () => clearTimeout(timer);
    }, [isOpen]);

    const handleSubmit = async (): Promise<void> => {
        if (!description.trim()) return;

        setIsSending(true);
        setSendStatus('idle');
        setErrorMessage('');

        try {
            await sendEmailViaGraph(reporterName, severity, description);
            setSendStatus('success');
        } catch (error: any) {
            console.error('Bug report send failed:', error);
            setSendStatus('error');
            setErrorMessage(
                error?.message ?? 'Failed to send the bug report. Please try again or contact support directly.'
            );
        } finally {
            setIsSending(false);
        }
    };

    const isSubmitDisabled = description.trim().length === 0 || isSending;

    return (
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
            {/* Expanded panel */}
            <div
                style={{
                    width: '340px',
                    backgroundColor: THEME.colors.panel,
                    border: `1px solid ${THEME.colors.border}`,
                    borderRadius: '16px',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.14)',
                    overflow: 'hidden',
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
                            {isSending ? 'Sending...' : 'Sent directly via Microsoft Graph'}
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
                    {sendStatus === 'success' ? (
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
                                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="11" cy="11" r="10" stroke={THEME.colors.primary} strokeWidth="1.5" />
                                    <path d="M7 11.5l3 3 5-6" stroke={THEME.colors.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div style={{ fontWeight: 700, color: THEME.colors.textStrong, fontSize: '14px' }}>
                                Bug report sent!
                            </div>
                            <div style={{ fontSize: '12px', color: THEME.colors.textSecondary, lineHeight: 1.6 }}>
                                Your report has been sent to{' '}
                                <strong style={{ color: THEME.colors.textPrimary }}>{SUPPORT_EMAIL}</strong>.
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
                    ) : sendStatus === 'error' ? (
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
                                    backgroundColor: '#fee2e2',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '22px',
                                    color: '#ef4444',
                                }}
                            >
                                !
                            </div>
                            <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '14px' }}>
                                Sending failed
                            </div>
                            <div style={{ fontSize: '12px', color: THEME.colors.textSecondary, lineHeight: 1.6 }}>
                                {errorMessage}
                            </div>
                            <button
                                type="button"
                                onClick={() => setSendStatus('idle')}
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
                                Try again
                            </button>
                        </div>
                    ) : (
                        // Form state
                        <>
                            <div style={{ fontSize: '12px', color: THEME.colors.textSecondary, lineHeight: 1.5 }}>
                                This report will be sent directly to <strong>{SUPPORT_EMAIL}</strong>.
                            </div>

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
                                        border: `1px solid ${THEME.colors.border}`,
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
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                }}
                            >
                                {isSending ? (
                                    <>
                                        <div
                                            style={{
                                                width: '12px',
                                                height: '12px',
                                                borderRadius: '50%',
                                                border: '2px solid rgba(255,255,255,0.3)',
                                                borderTopColor: '#ffffff',
                                                animation: 'bug-spin 600ms linear infinite',
                                            }}
                                        />
                                        Sending...
                                    </>
                                ) : (
                                    'Send Report'
                                )}
                            </button>
                            <style>{`
                                @keyframes bug-spin {
                                    to { transform: rotate(360deg); }
                                }
                            `}</style>
                        </>
                    )}
                </div>
            </div>

            {/* Trigger button */}
            <TriggerButton
                onClick={() => setIsOpen((prev) => !prev)}
                hasUnread={!isOpen}
            />
        </div>
    );
};

export default BugReportWidget;