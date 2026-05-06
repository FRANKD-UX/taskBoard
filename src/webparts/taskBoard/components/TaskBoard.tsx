// TaskBoard.tsx
import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import type { DropResult } from 'react-beautiful-dnd';

import AppLayout, { type PrimaryViewKey } from './AppLayout';
import BoardView from './BoardView';
import CalendarView from './CalendarView';
import ChartView from './ChartView';
import GanttView from './GanttView';
import type { ITaskBoardProps } from './ITaskBoardProps';
import ReportsView, { type IPowerBiReport } from './ReportsView';
import TableView from './TableView';
import type {
    IncidentStatus,
    Task,
    TaskPriority,
    TaskRequestType,
    TaskSite,
    TaskStatus,
    WorkItemStatus,
    WorkItemType,
} from './TaskTypes';
import { buildIncidentSla, getPriorityFromSeverity } from './incidentSla';
import { THEME } from './theme';
import WorkItemModal from './WorkItemModal';
import { initSP, getSP, DATA_SITE } from '../../../pnpjsConfig';
import { TaskService } from '../../../services/TaskService';
import { NotificationService } from '../../../services/NotificationService';
import { getUserRole } from '../../../services/UserRoleService';

type ViewKey = 'board' | 'table' | 'calendar' | 'gantt' | 'chart';

const TEMP_ID_PREFIX = 'temp_';

const TASK_STATUSES: TaskStatus[] = ['Unassigned', 'Backlog', 'ThisWeek', 'InProgress', 'Completed'];
const INCIDENT_STATUSES: IncidentStatus[] = ['New', 'Investigating', 'Escalated', 'Resolved'];

const VIEW_TABS: Array<{ key: ViewKey; label: string }> = [
    { key: 'board', label: 'Board' },
    { key: 'table', label: 'Table' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'gantt', label: 'Gantt' },
    { key: 'chart', label: 'Chart' },
];

// Power BI report configuration (unchanged)
const POWER_BI_REPORTS: IPowerBiReport[] = [
    {
        id: 'operations-overview',
        label: 'Operations Overview',
        reportId: '9e696574-3c3e-4c71-93ef-98146253db35',
        groupId: '0fce8c90-eb63-4080-b483-4e23534c0e6e',
        tenantId: '83223fdc-5c39-40ab-b34a-896fca28d3b2',
    },
];

const toRequestType = (type: WorkItemType): TaskRequestType => {
    return type === 'incident' ? 'Incident' : 'Task';
};

const toWorkItemType = (requestType?: string): WorkItemType => {
    return (requestType ?? '').toLowerCase() === 'incident' ? 'incident' : 'task';
};

const toTaskPriority = (value?: string): TaskPriority => {
    if (value === 'Critical' || value === 'Low' || value === 'High') return value;
    return 'Medium';
};

const toTaskSite = (value?: string): TaskSite => {
    return value === 'Troyville' ? 'Troyville' : 'Albertsdal';
};

const toTaskStatus = (value?: string): TaskStatus => {
    if (value && TASK_STATUSES.indexOf(value as TaskStatus) > -1) {
        return value as TaskStatus;
    }
    return 'Unassigned';
};

const toIncidentStatus = (value?: string): IncidentStatus => {
    if (value && INCIDENT_STATUSES.indexOf(value as IncidentStatus) > -1) {
        return value as IncidentStatus;
    }
    return 'New';
};

const toWorkItemStatus = (value: string | undefined, type: WorkItemType): WorkItemStatus => {
    return type === 'incident' ? toIncidentStatus(value) : toTaskStatus(value);
};

const getStatusesForType = (type: WorkItemType): WorkItemStatus[] => {
    return type === 'incident' ? INCIDENT_STATUSES : TASK_STATUSES;
};

const getTodayIso = (): string => {
    const d = new Date();
    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
    ].join('-');
};

const reorderTasksAfterDrag = (
    tasks: Task[],
    result: DropResult,
    statuses: WorkItemStatus[]
): Task[] => {
    const { source, destination, draggableId } = result;
    if (!destination) return tasks;

    const srcStatus = source.droppableId as WorkItemStatus;
    const dstStatus = destination.droppableId as WorkItemStatus;

    if (
        statuses.indexOf(srcStatus) === -1 ||
        statuses.indexOf(dstStatus) === -1 ||
        (srcStatus === dstStatus && source.index === destination.index)
    ) {
        return tasks;
    }

    const draggedTask = tasks.find((task) => task.id === draggableId);
    if (!draggedTask) return tasks;

    const relevantTasks = tasks.filter((task) => task.type === draggedTask.type);
    const grouped = statuses.reduce<Record<string, Task[]>>((acc, status) => {
        acc[status] = [];
        return acc;
    }, {});

    relevantTasks.forEach((task) => {
        if (statuses.indexOf(task.status) > -1) {
            grouped[task.status].push(task);
        } else {
            grouped[statuses[0]].push(task);
        }
    });

    const srcTasks = grouped[srcStatus].slice();
    const dstTasks = srcStatus === dstStatus ? srcTasks : grouped[dstStatus].slice();

    const [moved] = srcTasks.splice(source.index, 1);
    if (!moved) return tasks;

    dstTasks.splice(destination.index, 0, { ...moved, status: dstStatus });
    grouped[srcStatus] = srcTasks;
    grouped[dstStatus] = dstTasks;

    const reorderedRelevantTasks = statuses.reduce<Task[]>((acc, status) => acc.concat(grouped[status]), []);
    const reorderedIds = new Set(reorderedRelevantTasks.map((task) => task.id));

    return [
        ...tasks.filter((task) => !reorderedIds.has(task.id)),
        ...reorderedRelevantTasks,
    ];
};

const resolveUserNameFromId = async (userId: number): Promise<string | null> => {
    const sp = getSP();
    try {
        const user = await sp.web.siteUsers.getById(userId)();
        return user?.Title || null;
    } catch {
        try {
            const userInfo = await sp.web.siteUserInfoList.items
                .filter(`Id eq ${userId}`)
                .select('Id,Title')
                .top(1)();
            if (userInfo && userInfo.length > 0) {
                return userInfo[0].Title;
            }
        } catch {
            // ignore
        }
        return null;
    }
};

const resolveSharePointUserId = async (
    email: string,
    loginName: string
): Promise<number | null> => {
    const sp = getSP();
    if (email) {
        try {
            const result = await sp.web.ensureUser(email);
            if (result?.Id) return result.Id as number;
        } catch { }
    }
    if (loginName) {
        try {
            const result = await sp.web.ensureUser(loginName);
            if (result?.Id) return result.Id as number;
        } catch { }
    }
    if (email) {
        try {
            const userInfo = await sp.web.siteUserInfoList.items
                .filter(`UserName eq '${email}'`)
                .select('Id')
                .top(1)();
            if (userInfo && userInfo.length > 0) return userInfo[0].Id as number;
        } catch { }
    }
    return null;
};

const TaskBoard: React.FC<ITaskBoardProps> = ({ context }): React.ReactElement => {
    const [workItems, setWorkItems] = useState<Task[]>([]);
    const [modalTask, setModalTask] = useState<Task | null>(null);
    const [selectedView, setSelectedView] = useState<PrimaryViewKey>('dashboard');
    const [activeView, setActiveView] = useState<ViewKey>('board');
    const [displayedView, setDisplayedView] = useState<ViewKey>('board');
    const [isViewVisible, setIsViewVisible] = useState<boolean>(true);
    const [hoveredTab, setHoveredTab] = useState<ViewKey | null>(null);
    const [canAssign, setCanAssign] = useState<boolean>(false);
    const [currentUserName, setCurrentUserName] = useState<string>('');
    const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
    const [currentUserSpId, setCurrentUserSpId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const taskService = useMemo(() => new TaskService(), []);

    const taskItems = useMemo(() => workItems.filter((item) => item.type === 'task'), [workItems]);
    const incidentItems = useMemo(() => workItems.filter((item) => item.type === 'incident'), [workItems]);

    useEffect(() => {
        (window as any).spfxContext = context;
        initSP(context);   // <-- INITIALIZE ONCE HERE
    }, [context]);

    const mapServiceItemToTask = React.useCallback(async (item: any, createdByFallback: string): Promise<Task> => {
        const type = item.type || toWorkItemType(item.requestType);
        const priority = type === 'incident' && item.severity
            ? getPriorityFromSeverity(item.severity)
            : toTaskPriority(item.priority);

        let assignedToName = '';
        if (item.assignedTo) {
            if (typeof item.assignedTo === 'object') {
                assignedToName = item.assignedTo.Title || item.assignedTo.Name || '';
            } else {
                assignedToName = String(item.assignedTo);
            }
        }
        if (!assignedToName) {
            const userId = item.assignedToId;
            if (userId && userId > 0) {
                const resolvedName = await resolveUserNameFromId(userId);
                if (resolvedName) assignedToName = resolvedName;
            }
        }
        if (!assignedToName && item.assignedToEmail) {
            assignedToName = item.assignedToEmail.split('@')[0] || item.assignedToEmail;
        }

        return {
            id: item.id.toString(),
            type,
            title: item.title,
            status: toWorkItemStatus(item.status, type),
            priority,
            site: toTaskSite(item.site),
            assignedTo: assignedToName,
            assignedToUser: assignedToName ? {
                id: item.assignedToId ?? null,
                name: assignedToName,
                email: item.assignedToEmail ?? '',
            } : undefined,
            assignedToId: item.assignedToId ?? undefined,
            assignedToEmail: item.assignedToEmail,
            assignedToLoginName: item.assignedToLoginName,
            startDate: item.startDate,
            dueDate: item.dueDate,
            createdAt: item.createdAt || new Date().toISOString(),
            requestType: toRequestType(type),
            department: item.department || 'IT',
            description: item.description,
            createdBy: item.createdBy || createdByFallback,
            severity: item.severity,
            impact: item.impact,
            affectedService: item.affectedService,
            incidentTypeId: item.incidentTypeId,
            incidentType: item.incidentType,
            slaResponseMinutes: item.slaResponseMinutes,
            slaResolutionMinutes: item.slaResolutionMinutes,
            responseDueDate: item.responseDueDate,
            resolutionDueDate: item.resolutionDueDate,
            slaDeadline: item.slaDeadline,
            slaStatus: item.slaStatus,
        };
    }, []);

    const loadAndMapTasks = async (): Promise<void> => {
        if (!taskService) return;
        try {
            const sp = getSP();
            const user = await sp.web.currentUser();
            setCurrentUserName(user.Title || '');
            setCurrentUserEmail(user.Email || '');
            setCurrentUserSpId((user as any).Id ?? null);

            const items = await taskService.getTasks();
            const mappedTasks = await Promise.all(
                items.map((item: any) => mapServiceItemToTask(item, user.Title || ''))
            );
            setWorkItems(mappedTasks);
        } catch (error) {
            console.error('TaskBoard: load failed', error);
        }
    };

    useEffect(() => {
        const initialize = async () => {
            try {
                setIsLoading(true);
                const sp = getSP();
                const user = await sp.web.currentUser();
                setCurrentUserName(user.Title || '');
                setCurrentUserEmail(user.Email || '');
                setCurrentUserSpId((user as any).Id ?? null);

                try {
                    const role = await getUserRole(user.Email || '');
                    setCanAssign(role?.canAssign === true);
                } catch (roleError) {
                    console.warn('TaskBoard: role lookup failed; continuing with read-only assignment mode', roleError);
                    setCanAssign(false);
                }

                const notificationService = new NotificationService(context);
                taskService.setNotificationService(notificationService);

                await taskService.checkAndEscalateSLAs();
                await loadAndMapTasks();
            } catch (error) {
                console.error('TaskBoard: initial load failed', error);
            } finally {
                setIsLoading(false);
            }
        };
        initialize();
    }, [context]);

    useEffect(() => {
        if (isLoading || !currentUserName) return;
        const interval = setInterval(async () => {
            try {
                await taskService.checkAndEscalateSLAs();
                const items = await taskService.getTasks();
                const mapped = await Promise.all(
                    items.map((item: any) => mapServiceItemToTask(item, currentUserName))
                );
                setWorkItems(mapped);
            } catch (error) {
                console.error('Periodic refresh failed', error);
            }
        }, 60000);
        return () => clearInterval(interval);
    }, [isLoading, currentUserName, taskService, mapServiceItemToTask]);

    useEffect(() => {
        if (activeView === displayedView) return;
        setIsViewVisible(false);
        const timer = setTimeout(() => {
            setDisplayedView(activeView);
            setIsViewVisible(true);
        }, 120);
        return () => clearTimeout(timer);
    }, [activeView, displayedView]);

    const handleDragEnd = async (result: DropResult): Promise<void> => {
        const { destination, draggableId } = result;
        if (!destination) return;
        const draggedItem = workItems.find((item) => item.id === draggableId);
        if (!draggedItem) return;
        const statuses = getStatusesForType(draggedItem.type);
        const newStatus = destination.droppableId as WorkItemStatus;
        if (statuses.indexOf(newStatus) === -1) return;
        try {
            await taskService.updateTask(Number(draggableId), {
                status: newStatus,
                requestType: toRequestType(draggedItem.type),
                severity: draggedItem.severity,
                impact: draggedItem.impact,
                affectedService: draggedItem.affectedService,
            });
            setWorkItems((current) => reorderTasksAfterDrag(current, result, statuses));
        } catch (error) {
            console.error('TaskBoard: drag update failed', error);
        }
    };

    const handleTaskClick = (task: Task): void => {
        setModalTask(task);
    };

    const handleNewTask = (status: WorkItemStatus, type: WorkItemType): void => {
        const today = getTodayIso();
        const draft: Task = {
            id: `${TEMP_ID_PREFIX}${Date.now()}`,
            type,
            title: '',
            status,
            priority: 'Medium',
            site: 'Albertsdal',
            startDate: today,
            dueDate: undefined,
            createdAt: new Date().toISOString(),
            requestType: toRequestType(type),
            department: 'IT',
            description: '',
            assignedTo: canAssign ? '' : currentUserName,
            assignedToEmail: canAssign ? undefined : currentUserEmail,
            createdBy: currentUserName,
            severity: undefined,
            impact: type === 'incident' ? '' : undefined,
            affectedService: type === 'incident' ? '' : undefined,
            incidentTypeId: undefined,
            incidentType: null,
            slaResponseMinutes: undefined,
            slaResolutionMinutes: undefined,
            responseDueDate: undefined,
            resolutionDueDate: undefined,
            slaDeadline: undefined,
            slaStatus: undefined,
        };
        setModalTask(draft);
    };

    const handleCloseModal = (): void => {
        setModalTask(null);
    };

    const handleSaveTask = async (task: Task): Promise<Task | null> => {
        try {
            const isNew = task.id.startsWith(TEMP_ID_PREFIX);
            const existingTask = isNew ? null : workItems.find((item) => item.id === task.id) ?? null;

            const effectiveTask: Task = !canAssign
                ? {
                    ...task,
                    assignedTo: currentUserName,
                    assignedToEmail: currentUserEmail,
                    assignedToId: undefined,
                    assignedToLoginName: undefined,
                }
                : task;

            let finalAssigneeId: number | null = effectiveTask.assignedToId ?? null;
            let finalAssigneeName = effectiveTask.assignedTo || '';

            if (
                (!finalAssigneeId || finalAssigneeId <= 0) &&
                (effectiveTask.assignedToEmail || effectiveTask.assignedToLoginName)
            ) {
                const resolved = await resolveSharePointUserId(
                    effectiveTask.assignedToEmail || '',
                    effectiveTask.assignedToLoginName || ''
                );
                if (resolved) finalAssigneeId = resolved;
            }

            if (!finalAssigneeId || finalAssigneeId <= 0) {
                if (effectiveTask.assignedToEmail || effectiveTask.assignedToLoginName || effectiveTask.assignedTo) {
                    throw new Error('Could not resolve selected user to a SharePoint account. Select a valid user and try again.');
                }
                finalAssigneeId = null;
                finalAssigneeName = '';
            }

            const incidentType = effectiveTask.type === 'incident'
                ? effectiveTask.incidentType ?? null
                : null;
            const incidentTypeId = effectiveTask.type === 'incident'
                ? incidentType?.id ?? effectiveTask.incidentTypeId ?? null
                : null;
            const derivedSeverity = effectiveTask.type === 'incident'
                ? incidentType?.severity ?? effectiveTask.severity
                : undefined;
            const derivedPriority = effectiveTask.type === 'incident'
                ? getPriorityFromSeverity(derivedSeverity)
                : effectiveTask.priority;
            const derivedDepartment = effectiveTask.type === 'incident'
                ? incidentType?.department || effectiveTask.department || 'IT'
                : effectiveTask.department || 'IT';

            if (effectiveTask.type === 'incident' && (!incidentTypeId || !derivedSeverity)) {
                throw new Error('Incident Type is required before an incident can be created.');
            }

            const normaliseDate = (value?: string): string => {
                if (!value) return '';
                if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
                const parsed = new Date(value);
                return isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
            };

            const shouldRebuildIncidentSla = effectiveTask.type === 'incident'
                && Boolean(derivedSeverity)
                && (
                    isNew
                    || existingTask?.incidentTypeId !== incidentTypeId
                    || !existingTask?.responseDueDate
                    || !existingTask?.resolutionDueDate
                );

            const incidentSla = shouldRebuildIncidentSla && derivedSeverity
                ? buildIncidentSla(derivedSeverity)
                : null;

            const payload = {
                title: effectiveTask.title,
                status: effectiveTask.status,
                priority: derivedPriority,
                site: effectiveTask.site || 'Albertsdal',
                assignedToId: finalAssigneeId,
                startDate: normaliseDate(effectiveTask.startDate) || getTodayIso(),
                dueDate: normaliseDate(effectiveTask.dueDate),
                description: effectiveTask.description || '',
                requestType: toRequestType(effectiveTask.type),
                department: derivedDepartment,
                severity: effectiveTask.type === 'incident' ? derivedSeverity : undefined,
                impact: effectiveTask.type === 'incident' ? effectiveTask.impact || '' : undefined,
                affectedService: effectiveTask.type === 'incident' ? effectiveTask.affectedService || '' : undefined,
                incidentTypeId: effectiveTask.type === 'incident' ? incidentTypeId : null,
                incidentType: effectiveTask.type === 'incident' ? incidentType : null,
                slaResponseMinutes: incidentSla?.responseMinutes ?? effectiveTask.slaResponseMinutes,
                slaResolutionMinutes: incidentSla?.resolutionMinutes ?? effectiveTask.slaResolutionMinutes,
                responseDueDate: incidentSla?.responseDueDate ?? effectiveTask.responseDueDate,
                resolutionDueDate: incidentSla?.resolutionDueDate ?? effectiveTask.resolutionDueDate,
                slaDeadline: incidentSla?.deadline ?? effectiveTask.slaDeadline,
                slaStatus: incidentSla?.status ?? effectiveTask.slaStatus,
            };

            if (isNew) {
                const created = await taskService.createTask(payload);
                const returnedId: string | undefined = created?.id != null
                    ? created.id.toString()
                    : undefined;

                if (!returnedId) {
                    const items = await taskService.getTasks();
                    const mapped = await Promise.all(
                        items.map((item: any) => mapServiceItemToTask(item, currentUserName))
                    );
                    setWorkItems(mapped);
                    return { ...effectiveTask, id: `recovered_${Date.now()}` };
                }

                const persisted: Task = {
                    ...effectiveTask,
                    id: returnedId,
                    priority: derivedPriority,
                    assignedTo: finalAssigneeName,
                    assignedToId: finalAssigneeId ?? undefined,
                    startDate: payload.startDate,
                    dueDate: payload.dueDate,
                    requestType: toRequestType(effectiveTask.type),
                    createdBy: currentUserName,
                    department: derivedDepartment,
                    severity: derivedSeverity,
                    incidentTypeId,
                    incidentType,
                    slaResponseMinutes: payload.slaResponseMinutes,
                    slaResolutionMinutes: payload.slaResolutionMinutes,
                    responseDueDate: payload.responseDueDate,
                    resolutionDueDate: payload.resolutionDueDate,
                    slaDeadline: payload.slaDeadline,
                    slaStatus: payload.slaStatus,
                };

                setWorkItems((prev) => [...prev, persisted]);
                return persisted;
            }

            await taskService.updateTask(Number(effectiveTask.id), payload);

            const updated: Task = {
                ...effectiveTask,
                priority: derivedPriority,
                assignedTo: finalAssigneeName,
                assignedToId: finalAssigneeId ?? undefined,
                startDate: payload.startDate,
                dueDate: payload.dueDate,
                requestType: toRequestType(effectiveTask.type),
                department: derivedDepartment,
                severity: derivedSeverity,
                incidentTypeId,
                incidentType,
                slaResponseMinutes: payload.slaResponseMinutes,
                slaResolutionMinutes: payload.slaResolutionMinutes,
                responseDueDate: payload.responseDueDate,
                resolutionDueDate: payload.resolutionDueDate,
                slaDeadline: payload.slaDeadline,
                slaStatus: payload.slaStatus,
            };

            setWorkItems((prev) => prev.map((item) => (item.id === effectiveTask.id ? updated : item)));
            return updated;
        } catch (error) {
            console.error('TaskBoard: saveTask failed', error);
            if (error instanceof Error) throw error;
            throw new Error('Could not save work item to SharePoint.');
        }
    };

    const handleDeleteTask = async (id: string): Promise<void> => {
        try {
            if (!id.startsWith(TEMP_ID_PREFIX)) {
                await taskService.deleteTask(Number(id));
            }
            setWorkItems((prev) => prev.filter((item) => item.id !== id));
        } catch (error) {
            console.error('TaskBoard: delete failed', error);
        }
    };

    const handleUpdateTask = (id: string, updates: Partial<Task>): void => {
        let nextUpdates = updates;
        if (!canAssign && updates.assignedTo !== undefined) {
            const { assignedTo, assignedToId, assignedToEmail, assignedToLoginName, ...rest } = updates;
            nextUpdates = rest;
        }
        setWorkItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...nextUpdates } : item)));
    };

    const renderLoadingState = (message: string): React.ReactElement => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: THEME.colors.textSecondary, backgroundColor: THEME.colors.panel, border: `1px solid ${THEME.colors.border}`, borderRadius: '16px' }}>
            {message}
        </div>
    );

    const renderWorkspaceHeader = (title: string, description: string): React.ReactElement => (
        <div style={{ backgroundColor: THEME.colors.panel, border: `1px solid ${THEME.colors.border}`, borderRadius: '16px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)' }}>
            <h1 style={{ margin: 0, fontSize: '24px', color: THEME.colors.textStrong }}>{title}</h1>
            <p style={{ margin: '8px 0 0 0', color: THEME.colors.textSecondary, fontSize: '14px' }}>{description}</p>
        </div>
    );

    const renderTaskWorkspaceView = (view: ViewKey): React.ReactElement => {
        if (isLoading) return renderLoadingState('Loading tasks...');

        switch (view) {
            case 'board':
                return <BoardView tasks={taskItems} statuses={TASK_STATUSES} type="task" onTaskClick={handleTaskClick} onNewTask={handleNewTask} />;
            case 'table':
                return <TableView tasks={taskItems} statuses={TASK_STATUSES} updateTask={handleUpdateTask} deleteTask={handleDeleteTask} canAssign={canAssign} />;
            case 'calendar':
                return <CalendarView tasks={taskItems} onTaskClick={(id) => { const task = taskItems.find((item) => item.id === id); if (task) handleTaskClick(task); }} />;
            case 'gantt':
                return <GanttView tasks={taskItems} statuses={TASK_STATUSES} onTaskClick={(id) => { const task = taskItems.find((item) => item.id === id); if (task) handleTaskClick(task); }} />;
            case 'chart':
                return <ChartView tasks={taskItems} statuses={TASK_STATUSES} />;
            default:
                return <></>;
        }
    };

    const renderTasksView = (): React.ReactElement => (
        <div style={{ display: 'grid', gap: '16px' }}>
            {renderWorkspaceHeader('Tasks', 'Operational planning, delivery tracking, and cross-team execution.')}
            <div style={{ backgroundColor: THEME.colors.panel, border: `1px solid ${THEME.colors.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: '4px', padding: '12px 16px 0 16px', backgroundColor: THEME.colors.panel, borderBottom: `1px solid ${THEME.colors.border}` }}>
                    {VIEW_TABS.map((tab) => {
                        const isActive = activeView === tab.key;
                        const isHovered = hoveredTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveView(tab.key)}
                                onMouseEnter={() => setHoveredTab(tab.key)}
                                onMouseLeave={() => setHoveredTab(null)}
                                style={{
                                    backgroundColor: isActive ? THEME.colors.primary : isHovered ? THEME.colors.primarySoft : 'transparent',
                                    color: isActive ? '#ffffff' : THEME.colors.textPrimary,
                                    border: isActive ? `1px solid ${THEME.colors.primary}` : '1px solid transparent',
                                    borderRadius: '8px',
                                    padding: '8px 14px',
                                    cursor: 'pointer',
                                    fontWeight: isActive ? 700 : 500,
                                    fontSize: '14px',
                                    transition: 'background-color 160ms ease, color 160ms ease',
                                }}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
                <div style={{ transition: 'opacity 180ms ease, transform 180ms ease', opacity: isViewVisible ? 1 : 0, transform: isViewVisible ? 'translateY(0)' : 'translateY(4px)' }}>
                    {renderTaskWorkspaceView(displayedView)}
                </div>
            </div>
        </div>
    );

    const renderDashboardView = (): React.ReactElement => {
        const openTaskCount = taskItems.filter((item) => item.status !== 'Completed').length;
        const openIncidentCount = incidentItems.filter((item) => item.status !== 'Resolved').length;
        const criticalIncidentCount = incidentItems.filter((item) => item.severity === 'P1').length;
        const assignedCount = taskItems.filter((item) => Boolean(item.assignedTo)).length;

        if (isLoading) return renderLoadingState('Loading dashboard...');

        return (
            <div style={{ display: 'grid', gap: '16px' }}>
                {renderWorkspaceHeader('Dashboard', 'Portfolio snapshot across active tasks and operational incidents.')}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    {[
                        { label: 'Open Tasks', value: openTaskCount.toString() },
                        { label: 'Assigned Tasks', value: assignedCount.toString() },
                        { label: 'Open Incidents', value: openIncidentCount.toString() },
                        { label: 'P1 Incidents', value: criticalIncidentCount.toString() },
                    ].map((card) => (
                        <div key={card.label} style={{ backgroundColor: THEME.colors.panel, border: `1px solid ${THEME.colors.border}`, borderRadius: '16px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)' }}>
                            <div style={{ fontSize: '12px', color: THEME.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{card.label}</div>
                            <div style={{ marginTop: '10px', fontSize: '30px', fontWeight: 700, color: THEME.colors.textStrong }}>{card.value}</div>
                        </div>
                    ))}
                </div>
                <div style={{ backgroundColor: THEME.colors.panel, border: `1px solid ${THEME.colors.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                    <ChartView tasks={taskItems} statuses={TASK_STATUSES} />
                </div>
            </div>
        );
    };

    const renderIncidentsView = (): React.ReactElement => {
        if (isLoading) return renderLoadingState('Loading incidents...');
        return (
            <div style={{ display: 'grid', gap: '16px' }}>
                {renderWorkspaceHeader('Incidents', 'Track operational disruptions with severity, ownership, and impact context.')}
                <div style={{ backgroundColor: THEME.colors.panel, border: `1px solid ${THEME.colors.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                    <BoardView tasks={incidentItems} statuses={INCIDENT_STATUSES} type="incident" onTaskClick={handleTaskClick} onNewTask={handleNewTask} />
                </div>
            </div>
        );
    };

    const renderReportsView = (): React.ReactElement => (
        <div style={{ display: 'grid', gap: '16px' }}>
            {renderWorkspaceHeader('Reports', 'Embedded Power BI reports for operational analytics and performance tracking.')}
            <ReportsView reports={POWER_BI_REPORTS} />
        </div>
    );

    const renderSelectedView = (): React.ReactElement => {
        switch (selectedView) {
            case 'dashboard': return renderDashboardView();
            case 'incidents': return renderIncidentsView();
            case 'reports': return renderReportsView();
            case 'tasks':
            default: return renderTasksView();
        }
    };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <AppLayout selectedView={selectedView} onSelectView={setSelectedView}>
                {renderSelectedView()}
            </AppLayout>
            <WorkItemModal
                task={modalTask}
                canAssign={canAssign}
                siteUrl={DATA_SITE}
                context={context}
                currentUserName={currentUserName}
                currentUserSpId={currentUserSpId}
                onSave={handleSaveTask}
                onDelete={handleDeleteTask}
                onClose={handleCloseModal}
            />
        </DragDropContext>
    );
};

export default TaskBoard;