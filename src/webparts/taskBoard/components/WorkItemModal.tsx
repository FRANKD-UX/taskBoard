import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { WebPartContext } from '@microsoft/sp-webpart-base';

import CollaborationPanel from './CollaborationPanel';
import PeoplePicker from './PeoplePicker';
import type { IResolvedUser } from './PeoplePicker';
import type {
    IIncidentType,
    IncidentSeverity,
    IncidentStatus,
    Task,
    TaskPriority,
    TaskSite,
    TaskStatus,
    WorkItemType,
} from './TaskTypes';
import { THEME } from './theme';
import { DepartmentService } from '../../../services/DepartmentService';
import { SharePointService, type IncidentTypeItem } from '../services/SharePointService';

export interface IWorkItemModalProps {
    task: Task | null;
    canAssign: boolean;
    siteUrl?: string;
    context?: WebPartContext;
    currentUserName: string;
    currentUserSpId: number | null;
    onSave: (task: Task) => Promise<Task | null>;
    onDelete: (id: string) => void;
    onClose: () => void;
}

const TEMP_ID_PREFIX = 'temp_';

const TASK_STATUSES: TaskStatus[] = [
    'Unassigned',
    'Backlog',
    'ThisWeek',
    'InProgress',
    'Completed',
];

const INCIDENT_STATUSES: IncidentStatus[] = [
    'New',
    'Investigating',
    'Resolved',
];

const SITES: Array<{ value: TaskSite; label: string }> = [
    { value: 'Albertsdal', label: 'Albertsdal (Main Office)' },
    { value: 'Troyville', label: 'Troyville (Secondary Office)' },
];

const getTodayIso = (): string => {
    const now = new Date();
    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
    ].join('-');
};

const buildResolvedUser = (task: Task): IResolvedUser | null => {
    if (!task.assignedTo && !task.assignedToEmail) return null;
    return {
        id: task.assignedToId ?? null,
        name: task.assignedTo ?? '',
        email: task.assignedToEmail ?? task.assignedTo ?? '',
        loginName: task.assignedToLoginName ?? '',
    };
};

const toTaskSpId = (id: string): number | null => {
    if (!id || id.startsWith(TEMP_ID_PREFIX)) return null;
    const parsed = Number(id);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const toRequestType = (type: WorkItemType): 'Task' | 'Incident' => {
    return type === 'incident' ? 'Incident' : 'Task';
};

const getTypeLabel = (type: WorkItemType): string => {
    return type === 'incident' ? 'Incident' : 'Task';
};

const getStatusOptions = (type: WorkItemType): Array<TaskStatus | IncidentStatus> => {
    return type === 'incident' ? INCIDENT_STATUSES : TASK_STATUSES;
};

const getSeverityBadgeStyle = (severity?: IncidentSeverity): React.CSSProperties => {
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
            return { backgroundColor: '#f8fafc', color: THEME.colors.textSecondary, borderColor: THEME.colors.border };
    }
};

const getPriorityFromSeverity = (severity?: IncidentSeverity): TaskPriority => {
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

const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 1100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
};

const modalStyle: React.CSSProperties = {
    backgroundColor: THEME.colors.panel,
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: '14px',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 28px 56px rgba(0,0,0,0.15)',
    overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
    padding: '20px 24px 16px',
    borderBottom: `1px solid ${THEME.colors.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
};

const bodyStyle: React.CSSProperties = {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    overflowY: 'auto',
    flex: 1,
};

const footerStyle: React.CSSProperties = {
    padding: '16px 24px',
    borderTop: `1px solid ${THEME.colors.border}`,
    display: 'flex',
    gap: '10px',
    flexShrink: 0,
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: THEME.colors.background,
    color: THEME.colors.textStrong,
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
};

const gridTwoStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
};

const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: THEME.colors.textSecondary,
    fontSize: '24px',
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 4px',
};

const primaryBtnStyle: React.CSSProperties = {
    flex: 2,
    padding: '11px 16px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    backgroundColor: THEME.colors.primary,
    color: '#ffffff',
    transition: 'opacity 0.15s',
};

const dangerBtnStyle: React.CSSProperties = {
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

const cancelBtnStyle: React.CSSProperties = {
    flex: 1,
    padding: '11px 16px',
    borderRadius: '8px',
    border: `1px solid ${THEME.colors.border}`,
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: THEME.colors.textPrimary,
};

const typeBadgeStyle = (type: WorkItemType): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    borderRadius: '999px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 700,
    backgroundColor: type === 'incident' ? '#fff7ed' : THEME.colors.primarySoft,
    color: type === 'incident' ? '#9a3412' : '#0369a1',
});

const severityTagBaseStyle: React.CSSProperties = {
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

const WorkItemModal: React.FC<IWorkItemModalProps> = ({
    task,
    canAssign,
    siteUrl,
    context,
    currentUserName,
    currentUserSpId,
    onSave,
    onDelete,
    onClose,
}): React.ReactElement | null => {
    const sharePointService = useMemo(() => {
        return context ? new SharePointService(context) : null;
    }, [context]);

    const [draft, setDraft] = useState<Task | null>(null);
    const [assignee, setAssignee] = useState<IResolvedUser | null>(null);
    const [selectedIncidentType, setSelectedIncidentType] = useState<IIncidentType | null>(null);
    const [incidentTypes, setIncidentTypes] = useState<IIncidentType[]>([]);
    const [incidentTypesLoading, setIncidentTypesLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [saveError, setSaveError] = useState<string>('');
    const [titleError, setTitleError] = useState<string>('');
    const [incidentTypeError, setIncidentTypeError] = useState<string>('');
    const [departments, setDepartments] = useState<string[]>([]);
    const [departmentsLoading, setDepartmentsLoading] = useState<boolean>(true);

    useEffect(() => {
        console.log('WorkItemModal: SPFx context available', Boolean(context));
    }, [context]);

    const titleRef = useRef<HTMLInputElement>(null);
    const lastTaskIdRef = useRef<string | null>(null);
    const hasFocusedTitleRef = useRef<boolean>(false);
    const isNewItem = Boolean(draft?.id.startsWith(TEMP_ID_PREFIX));
    const isIncidentModal = Boolean(task && (task.requestType === 'Incident' || task.type === 'incident'));

    useEffect(() => {
        let isMounted = true;

        const loadDepartments = async (): Promise<void> => {
            const service = new DepartmentService();
            const data = await service.getDepartments();
            if (isMounted) {
                setDepartments(data);
                setDepartmentsLoading(false);
            }
        };

        loadDepartments();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadIncidentTypes = async (): Promise<void> => {
            console.log('WorkItemModal: requestType value', task?.requestType, 'type value', task?.type);

            if (!isIncidentModal) {
                if (isMounted) {
                    setIncidentTypes([]);
                    setIncidentTypesLoading(false);
                }
                return;
            }

            if (!sharePointService) {
                console.error('WorkItemModal: SPFx context is not available for IncidentTypes loading.');
                if (isMounted) {
                    setIncidentTypes([]);
                    setIncidentTypesLoading(false);
                }
                return;
            }

            try {
                if (isMounted) {
                    setIncidentTypesLoading(true);
                }

                const department = (draft?.department || '').trim();
                console.log('WorkItemModal: selected department for IncidentTypes', department);

                if (!department) {
                    if (isMounted) {
                        setIncidentTypes([]);
                        setIncidentTypesLoading(false);
                    }
                    return;
                }

                const data = await sharePointService.getIncidentTypes(department);
                console.log('WorkItemModal: loaded IncidentTypes', data);

                if (isMounted) {
                    const mappedIncidentTypes: IIncidentType[] = data.map((item: IncidentTypeItem) => ({
                        id: item.Id,
                        title: item.Title,
                        severity: item.Severity as IncidentSeverity,
                        department: item.Department,
                        isActive: item.IsActive,
                    }));

                    console.log('WorkItemModal: mapped IncidentTypes', mappedIncidentTypes);
                    setIncidentTypes(mappedIncidentTypes);
                }
            } catch (error) {
                console.error('WorkItemModal: failed to load IncidentTypes', error);
                if (isMounted) {
                    setIncidentTypes([]);
                }
            } finally {
                if (isMounted) {
                    setIncidentTypesLoading(false);
                }
            }
        };

        loadIncidentTypes();

        return () => {
            isMounted = false;
        };
    }, [draft?.department, isIncidentModal, sharePointService, task?.requestType, task?.type]);

    useEffect(() => {
        if (!task) {
            if (lastTaskIdRef.current) {
                console.log('WorkItemModal: clearing draft for closed task', lastTaskIdRef.current);
            }
            lastTaskIdRef.current = null;
            hasFocusedTitleRef.current = false;
            setDraft(() => null);
            setAssignee(null);
            setSelectedIncidentType(null);
            return;
        }

        if (lastTaskIdRef.current === task.id) {
            console.log('WorkItemModal: preserving draft state for task', task.id);
            if (currentUserName) {
                setDraft((previous) => {
                    if (!previous || previous.createdBy) return previous;
                    console.log('WorkItemModal: setting createdBy without resetting form', currentUserName);
                    return {
                        ...previous,
                        createdBy: currentUserName,
                    };
                });
            }
            return;
        }

        lastTaskIdRef.current = task.id;
        hasFocusedTitleRef.current = false;

        const today = getTodayIso();
        const normalizedType = task.type || (task.requestType === 'Incident' ? 'incident' : 'task');
        const normalizedStatus = task.status || (normalizedType === 'incident' ? 'New' : 'Unassigned');
        const initialIncidentType = normalizedType === 'incident' ? (task.incidentType || null) : null;
        const nextDraft: Task = {
            ...task,
            type: normalizedType,
            requestType: toRequestType(normalizedType),
            status: normalizedStatus,
            site: task.site || 'Albertsdal',
            startDate: task.startDate || today,
            createdAt: task.createdAt || new Date().toISOString(),
            createdBy: task.createdBy || currentUserName,
            severity: normalizedType === 'incident' ? task.severity : undefined,
            impact: normalizedType === 'incident' ? (task.impact || '') : undefined,
            affectedService: normalizedType === 'incident' ? (task.affectedService || '') : undefined,
            incidentTypeId: normalizedType === 'incident' ? task.incidentTypeId : undefined,
            incidentType: initialIncidentType,
            department: normalizedType === 'incident' && initialIncidentType?.department
                ? initialIncidentType.department
                : task.department,
            slaResponseMinutes: task.slaResponseMinutes,
            slaResolutionMinutes: task.slaResolutionMinutes,
            slaDeadline: task.slaDeadline,
            slaStatus: task.slaStatus,
        };

        console.log('WorkItemModal: initializing draft for task', task.id);
        setDraft(() => nextDraft);
        setSelectedIncidentType(initialIncidentType);
        setAssignee(buildResolvedUser(task));
        setSaveError('');
        setTitleError('');
        setIncidentTypeError('');
    }, [task, currentUserName]);

    useEffect(() => {
        if (!draft || draft.type !== 'incident' || incidentTypes.length === 0) return;

        const matchingIncidentType = draft.incidentTypeId
            ? incidentTypes.find((item) => item.id === draft.incidentTypeId) || null
            : draft.incidentType?.id
            ? incidentTypes.find((item) => item.id === draft.incidentType?.id) || draft.incidentType || null
            : null;

        if (!matchingIncidentType) return;
        if (selectedIncidentType?.id === matchingIncidentType.id && draft.severity === matchingIncidentType.severity) return;

        setSelectedIncidentType(matchingIncidentType);
        setDraft((previous) => {
            if (!previous || previous.type !== 'incident') return previous;
            return {
                ...previous,
                incidentTypeId: matchingIncidentType.id,
                incidentType: matchingIncidentType,
                severity: matchingIncidentType.severity,
                priority: getPriorityFromSeverity(matchingIncidentType.severity),
                department: matchingIncidentType.department || previous.department,
            };
        });
    }, [draft, incidentTypes, selectedIncidentType]);

    useEffect(() => {
        if (!draft || !isNewItem) return;
        if (hasFocusedTitleRef.current) return;
        hasFocusedTitleRef.current = true;
        console.log('WorkItemModal: focusing title once for new item', draft.id);
        const timer = setTimeout(() => titleRef.current?.focus(), 60);
        return () => clearTimeout(timer);
    }, [draft?.id, isNewItem]);

    useEffect(() => {
        const handleKey = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    if (!draft) return null;

    const update = (patch: Partial<Task>): void => {
        console.log('WorkItemModal: updating draft', patch);
        setDraft((previous) => {
            if (!previous) return previous;
            const nextType = patch.type || previous.type;
            return {
                ...previous,
                ...patch,
                requestType: toRequestType(nextType as WorkItemType),
            };
        });

        if ('title' in patch) setTitleError('');
    };

    const handleAssigneeChange = (user: IResolvedUser | null): void => {
        setAssignee(user);
        update({
            assignedTo: user?.name ?? '',
            assignedToId: user?.id ?? undefined,
            assignedToEmail: user?.email ?? undefined,
            assignedToLoginName: user?.loginName ?? undefined,
        });
    };

    const handleIncidentTypeChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
        const nextId = Number(event.target.value);
        const nextIncidentType = incidentTypes.find((item) => item.id === nextId) || null;

        setSelectedIncidentType(nextIncidentType);
        setIncidentTypeError('');
        update({
            incidentTypeId: nextIncidentType?.id,
            incidentType: nextIncidentType,
            severity: nextIncidentType?.severity,
            priority: getPriorityFromSeverity(nextIncidentType?.severity),
            department: nextIncidentType?.department || draft.department,
        });
    };

    const handleSave = async (): Promise<void> => {
        if (!draft.title.trim()) {
            setTitleError('Title is required');
            titleRef.current?.focus();
            return;
        }

        if (draft.type === 'incident' && !selectedIncidentType) {
            setIncidentTypeError('Incident Type is required');
            return;
        }

        setIsSaving(true);
        setSaveError('');

        try {
            const itemToSave: Task = draft.type === 'incident'
                ? {
                    ...draft,
                    requestType: 'Incident',
                    incidentTypeId: selectedIncidentType?.id,
                    incidentType: selectedIncidentType,
                    severity: selectedIncidentType?.severity,
                    impact: (draft.impact || '').trim(),
                    affectedService: (draft.affectedService || '').trim(),
                }
                : {
                    ...draft,
                    type: 'task',
                    requestType: 'Task',
                    severity: undefined,
                    impact: undefined,
                    affectedService: undefined,
                    incidentTypeId: undefined,
                    incidentType: null,
                };

            const saved = await onSave(itemToSave);
            if (!saved) {
                setSaveError(`Could not save ${draft.type}. Please verify required fields and assignee selection.`);
                return;
            }
            onClose();
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : `Could not save ${draft.type} to SharePoint. Please try again.`;
            setSaveError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (): void => {
        onDelete(draft.id);
        onClose();
    };

    const taskSpId = toTaskSpId(draft.id);
    const statusOptions = getStatusOptions(draft.type);
    const derivedSeverity = selectedIncidentType?.severity || draft.severity;
    const severityBadgeStyle = getSeverityBadgeStyle(derivedSeverity);
    const derivedPriority = draft.type === 'incident'
        ? getPriorityFromSeverity(derivedSeverity)
        : draft.priority;

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={(event) => event.stopPropagation()}>
                <div style={headerStyle}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: THEME.colors.textStrong }}>
                            {isNewItem ? `New ${getTypeLabel(draft.type)}` : `${getTypeLabel(draft.type)} Details`}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                            <span style={typeBadgeStyle(draft.type)}>{getTypeLabel(draft.type)}</span>
                            {!isNewItem && (
                                <span style={{ fontSize: '11px', color: THEME.colors.textSecondary }}>
                                    Created by {draft.createdBy || currentUserName || 'Unknown'}
                                </span>
                            )}
                        </div>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" style={closeBtnStyle}>
                        &times;
                    </button>
                </div>

                <div style={bodyStyle}>
                    <div>
                        <label style={labelStyle} htmlFor="wim-title">
                            Title <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            ref={titleRef}
                            id="wim-title"
                            type="text"
                            value={draft.title}
                            onChange={(event) => update({ title: event.target.value })}
                            placeholder={draft.type === 'incident' ? 'Enter incident title' : 'Enter task title'}
                            style={{ ...inputStyle, borderColor: titleError ? '#ef4444' : THEME.colors.border }}
                        />
                        {titleError && (
                            <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: '#ef4444' }}>
                                {titleError}
                            </span>
                        )}
                    </div>

                    {canAssign && (
                        <div>
                            <label style={labelStyle}>Assigned To</label>
                            <PeoplePicker
                                value={assignee}
                                onChange={handleAssigneeChange}
                                placeholder="Search by name or email..."
                                canEdit={true}
                                siteUrl={siteUrl}
                            />
                        </div>
                    )}

                    <div>
                        <label style={labelStyle} htmlFor="wim-site">Site</label>
                        <select
                            id="wim-site"
                            value={draft.site ?? 'Albertsdal'}
                            onChange={(event) => update({ site: event.target.value as TaskSite })}
                            style={inputStyle}
                        >
                            {SITES.map((site) => (
                                <option key={site.value} value={site.value}>{site.label}</option>
                            ))}
                        </select>
                    </div>

                    <div style={gridTwoStyle}>
                        <div>
                            <label style={labelStyle} htmlFor="wim-status">Status</label>
                            <select
                                id="wim-status"
                                value={draft.status}
                                onChange={(event) => update({ status: event.target.value as Task['status'] })}
                                style={inputStyle}
                            >
                                {statusOptions.map((status) => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle} htmlFor="wim-priority">Priority</label>
                            {draft.type === 'incident' ? (
                                <input
                                    id="wim-priority"
                                    type="text"
                                    value={derivedPriority}
                                    readOnly
                                    style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }}
                                />
                            ) : (
                                <select
                                    id="wim-priority"
                                    value={draft.priority}
                                    onChange={(event) => update({ priority: event.target.value as TaskPriority })}
                                    style={inputStyle}
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            )}
                        </div>
                    </div>

                    {draft.type === 'incident' && (
                        <>
                            <div style={gridTwoStyle}>
                                <div>
                                    <label style={labelStyle} htmlFor="wim-incident-type">
                                        Incident Type <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <select
                                        id="wim-incident-type"
                                        value={selectedIncidentType?.id ?? ''}
                                        onChange={handleIncidentTypeChange}
                                        disabled={incidentTypesLoading}
                                        style={{
                                            ...inputStyle,
                                            borderColor: incidentTypeError ? '#ef4444' : THEME.colors.border,
                                            opacity: incidentTypesLoading ? 0.7 : 1,
                                        }}
                                    >
                                        {incidentTypesLoading && (
                                            <option value="">Loading incident types...</option>
                                        )}
                                        {incidentTypes.map((incidentType) => (
                                            <option key={incidentType.id} value={incidentType.id}>
                                                {incidentType.title}
                                            </option>
                                        ))}
                                    </select>
                                    {incidentTypeError && (
                                        <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: '#ef4444' }}>
                                            {incidentTypeError}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <label style={labelStyle}>Severity</label>
                                    <div style={{ ...severityTagBaseStyle, ...severityBadgeStyle }}>
                                        {derivedSeverity || 'Select incident type'}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle} htmlFor="wim-affected-service">Affected Service</label>
                                <input
                                    id="wim-affected-service"
                                    type="text"
                                    value={draft.affectedService || ''}
                                    onChange={(event) => update({ affectedService: event.target.value })}
                                    placeholder="Email, network, ERP, payroll..."
                                    style={inputStyle}
                                />
                            </div>

                            <div>
                                <label style={labelStyle} htmlFor="wim-impact">Impact</label>
                                <textarea
                                    id="wim-impact"
                                    value={draft.impact || ''}
                                    onChange={(event) => update({ impact: event.target.value })}
                                    placeholder="Describe business impact and affected users"
                                    rows={3}
                                    style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                                />
                            </div>
                        </>
                    )}

                    <div style={gridTwoStyle}>
                        <div>
                            <label style={labelStyle} htmlFor="wim-start-date">
                                Start Date
                                {isNewItem && (
                                    <span style={{
                                        marginLeft: '6px',
                                        fontSize: '10px',
                                        color: THEME.colors.primary,
                                        textTransform: 'none',
                                        fontWeight: 400,
                                    }}>
                                        (auto)
                                    </span>
                                )}
                            </label>
                            <input
                                id="wim-start-date"
                                type="date"
                                value={draft.startDate?.split('T')[0] ?? ''}
                                onChange={(event) => update({ startDate: event.target.value })}
                                style={isNewItem ? { ...inputStyle, opacity: 0.6, cursor: 'not-allowed' } : inputStyle}
                                readOnly={isNewItem}
                            />
                        </div>
                        <div>
                            <label style={labelStyle} htmlFor="wim-due-date">Due Date</label>
                            <input
                                id="wim-due-date"
                                type="date"
                                value={draft.dueDate?.split('T')[0] ?? ''}
                                min={draft.startDate?.split('T')[0]}
                                onChange={(event) => update({ dueDate: event.target.value })}
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle} htmlFor="wim-department">Department</label>
                        <select
                            id="wim-department"
                            value={draft.department}
                            onChange={(event) => update({ department: event.target.value })}
                            style={inputStyle}
                        >
                            {departmentsLoading ? (
                                <option>Loading...</option>
                            ) : departments.length === 0 ? (
                                <option>No departments</option>
                            ) : (
                                departments.map((department) => (
                                    <option key={department} value={department}>{department}</option>
                                ))
                            )}
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle} htmlFor="wim-description">Description</label>
                        <textarea
                            id="wim-description"
                            value={draft.description ?? ''}
                            onChange={(event) => update({ description: event.target.value })}
                            placeholder={draft.type === 'incident' ? 'Add incident notes...' : 'Add a description...'}
                            rows={3}
                            style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                        />
                    </div>

                    {!isNewItem && (
                        <CollaborationPanel
                            taskSpId={taskSpId}
                            taskTitle={draft.title}
                            currentUserSpId={currentUserSpId}
                            siteUrl={siteUrl}
                        />
                    )}
                </div>

                {saveError && (
                    <div style={{
                        padding: '10px 24px',
                        backgroundColor: '#fef2f2',
                        borderTop: `1px solid ${THEME.colors.border}`,
                    }}>
                        <span style={{ color: '#ef4444', fontSize: '13px' }}>{saveError}</span>
                    </div>
                )}

                <div style={footerStyle}>
                    {isNewItem && (
                        <button type="button" onClick={onClose} style={cancelBtnStyle}>
                            Cancel
                        </button>
                    )}

                    {!isNewItem && (
                        <button type="button" onClick={handleDelete} style={dangerBtnStyle}>
                            Delete
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{ ...primaryBtnStyle, opacity: isSaving ? 0.65 : 1 }}
                    >
                        {isSaving ? 'Saving...' : isNewItem ? `Create ${getTypeLabel(draft.type)}` : 'Save & Close'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WorkItemModal;
