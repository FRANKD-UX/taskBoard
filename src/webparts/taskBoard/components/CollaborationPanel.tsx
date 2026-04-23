// CollaborationPanel.tsx
//
// Renders the "In Collaboration With" section inside TaskModal / TaskPanel.
//
// What it shows:
//   - Avatar stack of accepted collaborators.
//   - A "Request Collaborator" button that opens the PeoplePicker inline.
//   - A request history list showing Pending and Declined requests
//     so the task owner can see what is in flight and cancel if needed.

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';

import { CollaboratorService } from '../../../services/CollaboratorService';
import PeoplePicker from './PeoplePicker';
import type { IResolvedUser } from './PeoplePicker';
import type { ICollaborationRequest, ICollaborator } from './TaskTypes';
import { THEME } from './theme';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ICollaborationPanelProps {
    taskSpId: number | null;
    taskTitle: string;
    currentUserSpId: number | null;
    // The absolute URL of the SP site, e.g. "https://tenant.sharepoint.com/sites/Helpdesk".
    // Required for the raw-fetch path in CollaboratorService.createRequest.
    // Comes from context.pageContext.web.absoluteUrl in the parent component.
    siteUrl?: string;
}

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const AVATAR_PALETTE = ['#2563eb', '#7c3aed', '#0ea5e9', '#f59e0b', '#22c55e', '#ec4899', '#14b8a6'];

const collaboratorService = new CollaboratorService();

const getInitials = (name: string): string => {
    if (!name) return '?';
    return name
        .split(' ')
        .filter((p) => p.length > 0)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('');
};

const getAvatarColor = (name: string): string => {
    if (!name) return '#64748b';
    const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};

const formatDate = (iso?: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime())
        ? ''
        : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const Avatar: React.FC<{ collaborator: ICollaborator; size?: number }> = ({
    collaborator,
    size = 30,
}) => (
    <div
        title={`${collaborator.name}${collaborator.email ? ` — ${collaborator.email}` : ''}`}
        style={{
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
        }}
    >
        {getInitials(collaborator.name)}
    </div>
);

const StatusBadge: React.FC<{ status: ICollaborationRequest['status'] }> = ({ status }) => {
    const colorMap: Record<ICollaborationRequest['status'], string> = {
        Pending: '#f59e0b',
        Accepted: '#22c55e',
        Declined: '#ef4444',
    };

    return (
        <span
            style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#ffffff',
                backgroundColor: colorMap[status],
                borderRadius: '999px',
                padding: '2px 8px',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                flexShrink: 0,
            }}
        >
            {status}
        </span>
    );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const CollaborationPanel: React.FC<ICollaborationPanelProps> = ({
    taskSpId,
    taskTitle,
    currentUserSpId,
    siteUrl,
}): React.ReactElement => {
    const [requests, setRequests] = useState<ICollaborationRequest[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isRequesting, setIsRequesting] = useState<boolean>(false);
    const [isSending, setIsSending] = useState<boolean>(false);
    const [selectedUser, setSelectedUser] = useState<IResolvedUser | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // -----------------------------------------------------------------------
    // Data loading
    // -----------------------------------------------------------------------

    const loadRequests = useCallback(async (): Promise<void> => {
        if (!taskSpId) return;

        setIsLoading(true);
        try {
            const data = await collaboratorService.getRequestsForTask(taskSpId);
            setRequests(data);
        } catch (error) {
            console.error('CollaborationPanel: failed to load requests', error);
        } finally {
            setIsLoading(false);
        }
    }, [taskSpId]);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    // -----------------------------------------------------------------------
    // Derived state
    // -----------------------------------------------------------------------

    const acceptedCollaborators = requests
        .filter((r) => r.status === 'Accepted')
        .map((r) => r.collaborator);

    const pendingRequests = requests.filter((r) => r.status === 'Pending');
    const declinedRequests = requests.filter((r) => r.status === 'Declined');

    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------

    const handleSendRequest = async (): Promise<void> => {
        if (!selectedUser || !taskSpId || !currentUserSpId) return;

        const collaboratorSpId = selectedUser.id;
        if (!collaboratorSpId || collaboratorSpId <= 0) {
            setErrorMessage(
                'Could not resolve the selected user to a SharePoint account. Try selecting them again.'
            );
            return;
        }

        if (!siteUrl) {
            setErrorMessage('Site URL is not configured. Cannot send collaboration request.');
            return;
        }

        setErrorMessage('');
        setSuccessMessage('');
        setIsSending(true);

        try {
            const alreadyPending = await collaboratorService.pendingRequestExists(
                taskSpId,
                collaboratorSpId
            );
            if (alreadyPending) {
                setErrorMessage(`A pending request was already sent to ${selectedUser.name}.`);
                return;
            }

            const alreadyAccepted = acceptedCollaborators.some((c) => c.id === collaboratorSpId);
            if (alreadyAccepted) {
                setErrorMessage(`${selectedUser.name} is already collaborating on this task.`);
                return;
            }

            await collaboratorService.createRequest({
                taskId: taskSpId,
                taskTitle,
                collaboratorId: collaboratorSpId,
                requestedById: currentUserSpId,
                // Pass the absolute site URL so createRequest can construct
                // correct fetch URLs without relying on sp.web.toUrl() which
                // returns a relative path and causes a doubled URL in SPFx.
                siteAbsoluteUrl: siteUrl,
            });

            setSuccessMessage(
                `Collaboration request sent to ${selectedUser.name}. They will receive an email shortly.`
            );
            setSelectedUser(null);
            setIsRequesting(false);

            await loadRequests();
        } catch (error) {
            console.error('CollaborationPanel: failed to send request', error);
            setErrorMessage('Failed to send the collaboration request. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    const handleCancelRequest = async (
        requestId: number,
        collaboratorName: string
    ): Promise<void> => {
        if (!window.confirm(`Cancel the collaboration request sent to ${collaboratorName}?`)) return;

        try {
            await collaboratorService.cancelRequest(requestId);
            await loadRequests();
        } catch (error) {
            console.error('CollaborationPanel: failed to cancel request', error);
            setErrorMessage('Could not cancel the request. Please try again.');
        }
    };

    const handleToggleRequesting = (): void => {
        setIsRequesting((prev) => !prev);
        setSelectedUser(null);
        setErrorMessage('');
        setSuccessMessage('');
    };

    // -----------------------------------------------------------------------
    // Early return — task not yet saved to SharePoint
    // -----------------------------------------------------------------------

    if (!taskSpId) {
        return (
            <div style={sectionWrapperStyle}>
                <div style={sectionLabelStyle}>In Collaboration With</div>
                <div style={{ fontSize: '13px', color: THEME.colors.textSecondary }}>
                    Save the task first before adding collaborators.
                </div>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <div style={sectionWrapperStyle}>

            {/* Section header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={sectionLabelStyle}>In Collaboration With</div>
                <button
                    type="button"
                    onClick={handleToggleRequesting}
                    style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: isRequesting ? THEME.colors.textSecondary : '#2563eb',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 6px',
                    }}
                >
                    {isRequesting ? 'Cancel' : '+ Request Collaborator'}
                </button>
            </div>

            {/* Loading state */}
            {isLoading && (
                <div style={{ fontSize: '13px', color: THEME.colors.textSecondary }}>Loading...</div>
            )}

            {/* Accepted collaborator avatar stack */}
            {!isLoading && acceptedCollaborators.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {acceptedCollaborators.map((collaborator, index) => (
                        <div key={collaborator.email || collaborator.name} style={{ marginLeft: index === 0 ? 0 : -6 }}>
                            <Avatar collaborator={collaborator} size={32} />
                        </div>
                    ))}
                    <span style={{ marginLeft: '10px', fontSize: '13px', color: THEME.colors.textPrimary }}>
                        {acceptedCollaborators.map((c) => c.name).join(', ')}
                    </span>
                </div>
            )}

            {/* Empty state */}
            {!isLoading && acceptedCollaborators.length === 0 && !isRequesting && (
                <div style={{ fontSize: '13px', color: THEME.colors.textSecondary, marginBottom: '12px' }}>
                    No collaborators yet.
                </div>
            )}

            {/* Inline request form */}
            {isRequesting && (
                <div style={requestFormStyle}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: THEME.colors.textSecondary, marginBottom: '6px' }}>
                        Search for a person to collaborate with
                    </div>
                    <PeoplePicker
                        value={selectedUser}
                        onChange={setSelectedUser}
                        placeholder="Search by name or email..."
                        canEdit={true}
                        siteUrl={siteUrl}
                    />
                    <button
                        type="button"
                        onClick={handleSendRequest}
                        disabled={!selectedUser || isSending}
                        style={{
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
                        }}
                    >
                        {isSending ? 'Sending...' : 'Send Collaboration Request'}
                    </button>
                </div>
            )}

            {/* Success message */}
            {successMessage && (
                <div style={{ ...feedbackStyle, backgroundColor: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}>
                    {successMessage}
                </div>
            )}

            {/* Error message */}
            {errorMessage && (
                <div style={{ ...feedbackStyle, backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}>
                    {errorMessage}
                </div>
            )}

            {/* Pending requests */}
            {pendingRequests.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                    <div style={{ ...sectionLabelStyle, marginBottom: '8px' }}>Pending Requests</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {pendingRequests.map((req) => (
                            <div key={req.requestId} style={requestRowStyle}>
                                <Avatar collaborator={req.collaborator} size={26} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: THEME.colors.textPrimary }}>
                                        {req.collaborator.name}
                                    </div>
                                    <div style={{ fontSize: '11px', color: THEME.colors.textSecondary }}>
                                        Requested {formatDate(req.requestedAt)} by {req.requestedBy.name}
                                    </div>
                                </div>
                                <StatusBadge status={req.status} />
                                {req.requestedBy.id === currentUserSpId && (
                                    <button
                                        type="button"
                                        onClick={() => handleCancelRequest(req.requestId, req.collaborator.name)}
                                        title="Cancel request"
                                        style={cancelButtonStyle}
                                    >
                                        &times;
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Declined requests */}
            {declinedRequests.length > 0 && (
                <details style={{ marginTop: '14px' }}>
                    <summary style={{ fontSize: '12px', color: THEME.colors.textSecondary, cursor: 'pointer', userSelect: 'none' }}>
                        {declinedRequests.length} declined {declinedRequests.length === 1 ? 'request' : 'requests'}
                    </summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                        {declinedRequests.map((req) => (
                            <div key={req.requestId} style={{ ...requestRowStyle, opacity: 0.65 }}>
                                <Avatar collaborator={req.collaborator} size={26} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: THEME.colors.textPrimary }}>
                                        {req.collaborator.name}
                                    </div>
                                    <div style={{ fontSize: '11px', color: THEME.colors.textSecondary }}>
                                        Declined {formatDate(req.respondedAt)}
                                    </div>
                                </div>
                                <StatusBadge status={req.status} />
                            </div>
                        ))}
                    </div>
                </details>
            )}

        </div>
    );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const sectionWrapperStyle: React.CSSProperties = {
    borderTop: `1px solid ${THEME.colors.border}`,
    paddingTop: '16px',
    marginTop: '4px',
};

const sectionLabelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
};

const requestFormStyle: React.CSSProperties = {
    backgroundColor: '#f8fafc',
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: '10px',
    padding: '12px',
    marginBottom: '10px',
};

const requestRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    backgroundColor: '#f8fafc',
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: '8px',
};

const feedbackStyle: React.CSSProperties = {
    fontSize: '13px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid',
    marginTop: '8px',
};

const cancelButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: THEME.colors.textSecondary,
    fontSize: '18px',
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 2px',
    flexShrink: 0,
};

export default CollaborationPanel;