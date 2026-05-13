// TaskBoard.tsx

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';

import AppLayout, { type PrimaryViewKey } from './AppLayout';
import BoardView from './BoardView';
import CalendarView from './CalendarView';
import ChartView from './ChartView';
import GanttView from './GanttView';
import type { ITaskBoardProps } from './ITaskBoardProps';
import ReportsView, { type IPowerBiReport } from './ReportsView';
import TableView from './TableView';
import type {
    IncidentSeverity,
    IncidentStatus,
    Task,
    TaskDepartment,
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
import { CollaboratorService } from '../../../services/CollaboratorService';

import { IncidentVisibilityService } from '../../../services/incidents/IncidentVisibilityService';
import { IncidentAssignmentService } from '../../../services/incidents/IncidentAssignmentService';
import { IncidentPolicy, type IIncidentUserContext } from '../../../services/incidents/IncidentPolicy';
import { normalizeDepartment } from '../../../services/incidents/IncidentDepartmentRules';

type ViewKey = 'board' | 'table' | 'calendar' | 'gantt' | 'chart';

const TEMP_ID_PREFIX = 'temp_';

const TASK_STATUSES: TaskStatus[] = ['Unassigned', 'Backlog', 'ThisWeek', 'InProgress', 'Completed'];
const INCIDENT_STATUSES: IncidentStatus[] = ['New', 'Investigating', 'Escalated', 'Resolved'];
const INCIDENT_DEPARTMENT_TABS: TaskDepartment[] = ['Support', 'IT', 'Accounts', 'Operations', 'Complaints'];

const VIEW_TABS: Array<{ key: ViewKey; label: string }> = [
    { key: 'board', label: 'Board' },
    { key: 'table', label: 'Table' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'gantt', label: 'Gantt' },
    { key: 'chart', label: 'Chart' },
];

const POWER_BI_REPORTS: IPowerBiReport[] = [
    {
        id: 'operations-overview',
        label: 'Operations Overview',
        reportId: '9e696574-3c3e-4c71-93ef-98146253db35',
        groupId: '0fce8c90-eb63-4080-b483-4e23534c0e6e',
        tenantId: '83223fdc-5c39-40ab-b34a-896fca28d3b2',
    } as IPowerBiReport,
];

const toRequestType = (type: WorkItemType): TaskRequestType => type === 'incident' ? 'Incident' : 'Task';
const toWorkItemType = (requestType?: string): WorkItemType => (requestType ?? '').toLowerCase() === 'incident' ? 'incident' : 'task';

const toTaskPriority = (value?: string): TaskPriority => {
    if (value === 'Critical' || value === 'High' || value === 'Medium' || value === 'Low') return value;
    return 'Medium';
};

const toTaskSite = (value?: string): TaskSite => value === 'Troyville' ? 'Troyville' : 'Albertsdal';

const toTaskStatus = (value?: string): TaskStatus => {
    return value && TASK_STATUSES.indexOf(value as TaskStatus) > -1 ? value as TaskStatus : 'Unassigned';
};

const toIncidentStatus = (value?: string): IncidentStatus => {
    return value && INCIDENT_STATUSES.indexOf(value as IncidentStatus) > -1 ? value as IncidentStatus : 'New';
};

const toWorkItemStatus = (value: string | undefined, type: WorkItemType): WorkItemStatus => {
    return type === 'incident' ? toIncidentStatus(value) : toTaskStatus(value);
};

const getStatusesForType = (type: WorkItemType): WorkItemStatus[] => {
    return type === 'incident' ? INCIDENT_STATUSES : TASK_STATUSES;
};

const getTodayIso = (): string => {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
};

const resolveUserNameFromId = async (userId: number): Promise<string | null> => {
    const sp = getSP();
    try {
        const user = await sp.web.siteUsers.getById(userId)();
        return user?.Title ?? null;
    } catch {
        try {
            const userInfo = await sp.web.siteUserInfoList.items.filter(`Id eq ${userId}`).select('Id', 'Title').top(1)();
            return userInfo?.[0]?.Title ?? null;
        } catch {
            return null;
        }
    }
};

const resolveSharePointUserId = async (email: string, loginName: string): Promise<number | null> => {
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
            const safeEmail = email.replace(/'/g, "''");
            const userInfo = await sp.web.siteUserInfoList.items.filter(`UserName eq '${safeEmail}'`).select('Id').top(1)();
            if (userInfo?.[0]?.Id) return userInfo[0].Id as number;
        } catch { }
    }

    return null;
};

const fetchCollaborationTaskIds = async (userId: number): Promise<Set<string>> => {
    const collabService = new CollaboratorService();
    try {
        const ids = await collabService.getAcceptedTaskIdsForUser(userId);
        return new Set(ids.map(String));
    } catch {
        return new Set<string>();
    }
};

const TaskBoard: React.FC<ITaskBoardProps> = ({ context }): React.ReactElement => {
    const [workItems, setWorkItems] = useState<Task[]>([]);
    const [modalTask, setModalTask] = useState<Task | null>(null);

    const [selectedView, setSelectedView] = useState<PrimaryViewKey>('dashboard');
    const [activeView, setActiveView] = useState<ViewKey>('board');
    const [displayedView, setDisplayedView] = useState<ViewKey>('board');
    const [isViewVisible, setIsViewVisible] = useState<boolean>(true);
    const [hoveredTab, setHoveredTab] = useState<ViewKey | null>(null);

    const [selectedIncidentDepartment, setSelectedIncidentDepartment] = useState<TaskDepartment>('Support');
    const [hoveredIncidentDepartment, setHoveredIncidentDepartment] = useState<TaskDepartment | null>(null);

    const [canAssign, setCanAssign] = useState<boolean>(false);
    const [currentUserName, setCurrentUserName] = useState<string>('');
    const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
    const [currentUserSpId, setCurrentUserSpId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const [currentUserRole, setCurrentUserRole] = useState<string>('');
    const [currentUserDepartment, setCurrentUserDepartment] = useState<string>('Support');
    const [canAssignAcrossDepartments, setCanAssignAcrossDepartments] = useState<boolean>(false);
    const [isDepartmentLead, setIsDepartmentLead] = useState<boolean>(false);

    const taskService = useMemo(() => new TaskService(), []);

    const incidentUserContext = useMemo<IIncidentUserContext>(() => ({
        id: currentUserSpId,
        role: currentUserRole,
        department: currentUserDepartment,
        canAssign,
        canAssignAcrossDepartments,
        isDepartmentLead,
    }), [currentUserSpId, currentUserRole, currentUserDepartment, canAssign, canAssignAcrossDepartments, isDepartmentLead]);

    const taskItems = useMemo(() => workItems.filter((item) => item.type === 'task'), [workItems]);
    const allIncidentItems = useMemo(() => workItems.filter((item) => item.type === 'incident'), [workItems]);

    const visibleIncidentItems = useMemo(
        () => IncidentVisibilityService.filterVisibleIncidents(incidentUserContext, allIncidentItems),
        [incidentUserContext, allIncidentItems]
    );

    const incidentItems = useMemo(
        () => visibleIncidentItems.filter((item) => normalizeDepartment(item.department) === selectedIncidentDepartment),
        [visibleIncidentItems, selectedIncidentDepartment]
    );

    useEffect(() => {
        (window as any).spfxContext = context;
        initSP(context);
    }, [context]);

    const mapServiceItemToTask = React.useCallback(async (item: any, createdByFallback: string): Promise<Task> => {
        const type = item.type ?? toWorkItemType(item.requestType);
        const priority = type === 'incident' && item.severity ? getPriorityFromSeverity(item.severity) : toTaskPriority(item.priority);

        let assignedToName = '';
        if (item.assignedTo) {
            assignedToName = typeof item.assignedTo === 'object'
                ? item.assignedTo.Title ?? item.assignedTo.Name ?? ''
                : String(item.assignedTo);
        }

        if (!assignedToName && item.assignedToId) {
            const resolvedName = await resolveUserNameFromId(item.assignedToId);
            if (resolvedName) assignedToName = resolvedName;
        }

        if (!assignedToName && item.assignedToEmail) {
            assignedToName = item.assignedToEmail.split('@')[0] ?? item.assignedToEmail;
        }

        return {
            id: item.id.toString(),
            type,
            title: item.title,
            status: toWorkItemStatus(item.status, type),
            priority,
            site: toTaskSite(item.site),
            assignedTo: assignedToName,
            assignedToUser: assignedToName ? { id: item.assignedToId ?? null, name: assignedToName, email: item.assignedToEmail ?? '' } : undefined,
            assignedToId: item.assignedToId ?? undefined,
            assignedToEmail: item.assignedToEmail,
            assignedToLoginName: item.assignedToLoginName,
            startDate: item.startDate,
            dueDate: item.dueDate,
            createdAt: item.createdAt ?? new Date().toISOString(),
            requestType: toRequestType(type),
            department: normalizeDepartment(item.department),
            description: item.description,
            createdBy: item.createdBy ?? createdByFallback,
            authorId: item.authorId ?? null,
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

    const filterVisibleWorkItems = async (allTasks: Task[], userId: number, userContext: IIncidentUserContext): Promise<Task[]> => {
        const collaborationTaskIds = await fetchCollaborationTaskIds(userId);

        const tasks = allTasks.filter((task) => {
            if (task.type === 'incident') return false;
            return task.authorId === userId || task.assignedToId === userId || collaborationTaskIds.has(task.id);
        });

        const incidents = IncidentVisibilityService.filterVisibleIncidents(userContext, allTasks.filter((item) => item.type === 'incident'));
        return [...tasks, ...incidents];
    };

    const loadAndMapTasks = async (userContextOverride?: IIncidentUserContext): Promise<void> => {
        try {
            const sp = getSP();
            const user = await sp.web.currentUser();
            const userId = (user as any).Id;

            setCurrentUserName(user.Title ?? '');
            setCurrentUserEmail(user.Email ?? '');
            setCurrentUserSpId(userId ?? null);

            const items = await taskService.getTasks();
            const mappedTasks = await Promise.all(items.map((item: any) => mapServiceItemToTask(item, user.Title ?? '')));

            if (userId) {
                const visibleTasks = await filterVisibleWorkItems(mappedTasks, userId, userContextOverride ?? incidentUserContext);
                setWorkItems(visibleTasks);
            } else {
                setWorkItems(mappedTasks);
            }
        } catch (error) {
            console.error('TaskBoard: load failed', error);
        }
    };

    useEffect(() => {
        const initialize = async (): Promise<void> => {
            try {
                setIsLoading(true);
                const sp = getSP();
                const user = await sp.web.currentUser();
                const userId = (user as any).Id ?? null;
                const userEmail = user.Email ?? '';

                setCurrentUserName(user.Title ?? '');
                setCurrentUserEmail(userEmail);
                setCurrentUserSpId(userId);

                try {
                    const role = await getUserRole(userEmail);
                    const normalizedRoleDepartment = normalizeDepartment(role?.department);
                    const resolvedCanAssign = role?.canAssign === true;
                    const resolvedCanAssignAcrossDepartments = role?.canAssignAcrossDepartments === true;
                    const resolvedIsDepartmentLead = role?.isDepartmentLead === true;

                    setCanAssign(resolvedCanAssign);
                    setCurrentUserRole(role?.role ?? '');
                    setCurrentUserDepartment(normalizedRoleDepartment);
                    setCanAssignAcrossDepartments(resolvedCanAssignAcrossDepartments);
                    setIsDepartmentLead(resolvedIsDepartmentLead);

                    await loadAndMapTasks({
                        id: userId,
                        role: role?.role ?? '',
                        department: normalizedRoleDepartment,
                        canAssign: resolvedCanAssign,
                        canAssignAcrossDepartments: resolvedCanAssignAcrossDepartments,
                        isDepartmentLead: resolvedIsDepartmentLead,
                    });
                } catch (roleError) {
                    console.warn('TaskBoard: role lookup failed; defaulting to read-only assignment', roleError);
                    const fallbackDepartment = normalizeDepartment('Support');

                    setCanAssign(false);
                    setCurrentUserRole('');
                    setCurrentUserDepartment(fallbackDepartment);
                    setCanAssignAcrossDepartments(false);
                    setIsDepartmentLead(false);

                    await loadAndMapTasks({
                        id: userId,
                        role: '',
                        department: fallbackDepartment,
                        canAssign: false,
                        canAssignAcrossDepartments: false,
                        isDepartmentLead: false,
                    });
                }

                const notificationService = new NotificationService(context);
                taskService.setNotificationService(notificationService);
                await taskService.checkAndEscalateSLAs();
            } catch (error) {
                console.error('TaskBoard: initial load failed', error);
            } finally {
                setIsLoading(false);
            }
        };

        void initialize();
    }, [context, taskService, mapServiceItemToTask]);

    useEffect(() => {
        if (isLoading || !currentUserSpId) return;

        const interval = window.setInterval(async () => {
            try {
                await taskService.checkAndEscalateSLAs();
                const items = await taskService.getTasks();
                const mapped = await Promise.all(items.map((item: any) => mapServiceItemToTask(item, currentUserName)));
                const visibleTasks = await filterVisibleWorkItems(mapped, currentUserSpId, incidentUserContext);
                setWorkItems(visibleTasks);
            } catch (error) {
                console.error('TaskBoard: periodic refresh failed', error);
            }
        }, 60000);

        return () => window.clearInterval(interval);
    }, [isLoading, currentUserSpId, currentUserName, taskService, mapServiceItemToTask, incidentUserContext]);

    useEffect(() => {
        if (activeView === displayedView) return;
        setIsViewVisible(false);
        const timer = window.setTimeout(() => {
            setDisplayedView(activeView);
            setIsViewVisible(true);
        }, 120);
        return () => window.clearTimeout(timer);
    }, [activeView, displayedView]);

    const handleTaskStatusChange = async (taskId: string, newStatus: WorkItemStatus): Promise<void> => {
        const draggedItem = workItems.find((item) => item.id === taskId);
        if (!draggedItem) return;

        const statuses = getStatusesForType(draggedItem.type);
        if (statuses.indexOf(newStatus) === -1) return;

        setWorkItems((current) => current.map((task) => task.id === taskId ? { ...task, status: newStatus } : task));

        try {
            await taskService.updateTask(Number(taskId), {
                status: newStatus,
                requestType: toRequestType(draggedItem.type),
                severity: draggedItem.severity,
                impact: draggedItem.impact,
                affectedService: draggedItem.affectedService,
            });
        } catch (error) {
            console.error('TaskBoard: background status update failed – rolling back', error);
            setWorkItems((current) => current.map((task) => task.id === taskId ? { ...task, status: draggedItem.status } : task));
        }
    };

    const handleTaskClick = (task: Task): void => {
        setModalTask(task);
    };

    const handleNewTask = (status: WorkItemStatus, type: WorkItemType): void => {
        const today = getTodayIso();
        const defaultDepartment = type === 'incident' ? selectedIncidentDepartment : normalizeDepartment('IT');

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
            department: defaultDepartment,
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

    const handleCloseModal = (): void => setModalTask(null);

    const handleSaveTask = async (task: Task): Promise<Task | null> => {
        try {
            const isNew = task.id.startsWith(TEMP_ID_PREFIX);
            const existingTask = isNew ? null : workItems.find((item) => item.id === task.id) ?? null;

            const effectiveTask: Task = !canAssign && task.type !== 'incident'
                ? { ...task, assignedTo: currentUserName, assignedToEmail: currentUserEmail, assignedToId: undefined, assignedToLoginName: undefined }
                : task;

            let finalAssigneeId: number | null = effectiveTask.assignedToId ?? null;
            let finalAssigneeName = effectiveTask.assignedTo ?? '';

            if ((!finalAssigneeId || finalAssigneeId <= 0) && (effectiveTask.assignedToEmail || effectiveTask.assignedToLoginName)) {
                const resolved = await resolveSharePointUserId(effectiveTask.assignedToEmail ?? '', effectiveTask.assignedToLoginName ?? '');
                if (resolved) finalAssigneeId = resolved;
            }

            if (!finalAssigneeId || finalAssigneeId <= 0) {
                if (effectiveTask.assignedToEmail || effectiveTask.assignedToLoginName || effectiveTask.assignedTo) {
                    throw new Error('Could not resolve selected user to a SharePoint account. Select a valid user and try again.');
                }
                finalAssigneeId = null;
                finalAssigneeName = '';
            }

            const incidentType = effectiveTask.type === 'incident' ? effectiveTask.incidentType ?? null : null;
            const incidentTypeId = effectiveTask.type === 'incident' ? incidentType?.id ?? effectiveTask.incidentTypeId ?? null : null;
            const derivedSeverity = effectiveTask.type === 'incident' ? incidentType?.severity ?? effectiveTask.severity : undefined;
            const derivedPriority = effectiveTask.type === 'incident' ? getPriorityFromSeverity(derivedSeverity) : effectiveTask.priority;
            const derivedDepartment = effectiveTask.type === 'incident'
                ? normalizeDepartment(incidentType?.department ?? effectiveTask.department)
                : normalizeDepartment(effectiveTask.department);

            if (effectiveTask.type === 'incident' && (!incidentTypeId || !derivedSeverity)) {
                throw new Error('Incident Type is required before an incident can be created.');
            }

            if (effectiveTask.type === 'incident') {
                const incidentInput = {
                    department: derivedDepartment,
                    severity: derivedSeverity,
                    assignedToId: finalAssigneeId,
                    site: effectiveTask.site,
                    incidentTypeTitle: incidentType?.title,
                };

                if (isNew && !IncidentPolicy.canCreateIncident(incidentUserContext, derivedDepartment)) {
                    throw new Error('You are not allowed to create incidents for this department.');
                }

                if (!isNew && !IncidentPolicy.canEditIncident(incidentUserContext, incidentInput)) {
                    throw new Error('You are not allowed to edit this incident.');
                }

                if (IncidentPolicy.requiresSite(incidentInput) && !effectiveTask.site) {
                    throw new Error('IT incidents require a site.');
                }

                if (finalAssigneeId !== null && finalAssigneeId !== undefined) {
                    const canAssignIncident = finalAssigneeId === currentUserSpId
                        ? IncidentAssignmentService.canClaimIncident(incidentUserContext, {
                            department: derivedDepartment,
                            severity: derivedSeverity,
                            assignedToId: finalAssigneeId,
                            incidentType,
                            site: effectiveTask.site,
                        })
                        : IncidentAssignmentService.canAssignIncident(incidentUserContext, {
                            department: derivedDepartment,
                            severity: derivedSeverity,
                            assignedToId: finalAssigneeId,
                            incidentType,
                            site: effectiveTask.site,
                        }, {
                            id: finalAssigneeId,
                            department: derivedDepartment,
                        });

                    if (!canAssignIncident) throw new Error('You are not allowed to assign this incident.');
                }
            }

            const normaliseDate = (value?: string): string => {
                if (!value) return '';
                if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
                const parsed = new Date(value);
                return isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
            };

            const shouldRebuildIncidentSla = effectiveTask.type === 'incident' && Boolean(derivedSeverity) && (
                isNew ||
                existingTask?.incidentTypeId !== incidentTypeId ||
                !existingTask?.responseDueDate ||
                !existingTask?.resolutionDueDate
            );

            const incidentSla = shouldRebuildIncidentSla && derivedSeverity ? buildIncidentSla(derivedSeverity as IncidentSeverity) : null;

            const payload = {
                title: effectiveTask.title,
                status: effectiveTask.status,
                priority: derivedPriority,
                site: effectiveTask.site ?? 'Albertsdal',
                assignedToId: finalAssigneeId,
                startDate: normaliseDate(effectiveTask.startDate) || getTodayIso(),
                dueDate: normaliseDate(effectiveTask.dueDate),
                description: effectiveTask.description ?? '',
                requestType: toRequestType(effectiveTask.type),
                department: derivedDepartment,
                severity: effectiveTask.type === 'incident' ? derivedSeverity : undefined,
                impact: effectiveTask.type === 'incident' ? effectiveTask.impact ?? '' : undefined,
                affectedService: effectiveTask.type === 'incident' ? effectiveTask.affectedService ?? '' : undefined,
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
                const returnedId: string | undefined = created?.id != null ? created.id.toString() : undefined;

                if (!returnedId) {
                    const items = await taskService.getTasks();
                    const mapped = await Promise.all(items.map((item: any) => mapServiceItemToTask(item, currentUserName)));
                    const visibleTasks = currentUserSpId != null ? await filterVisibleWorkItems(mapped, currentUserSpId, incidentUserContext) : mapped;
                    setWorkItems(visibleTasks);
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

            setWorkItems((prev) => prev.map((item) => item.id === effectiveTask.id ? updated : item));
            return updated;
        } catch (error) {
            console.error('TaskBoard: saveTask failed', error);
            if (error instanceof Error) throw error;
            throw new Error('Could not save work item to SharePoint.');
        }
    };

    const handleDeleteTask = async (id: string): Promise<void> => {
        try {
            if (!id.startsWith(TEMP_ID_PREFIX)) await taskService.deleteTask(Number(id));
            setWorkItems((prev) => prev.filter((item) => item.id !== id));
        } catch (error) {
            console.error('TaskBoard: delete failed', error);
        }
    };

    const handleUpdateTask = (id: string, updates: Partial<Task>): void => {
        let nextUpdates = updates;

        if (updates.assignedTo !== undefined || updates.assignedToId !== undefined) {
            const existingItem = workItems.find((item) => item.id === id);

            if (existingItem?.type === 'incident') {
                const targetId = updates.assignedToId ?? existingItem.assignedToId ?? null;
                const canAssignIncident = targetId === currentUserSpId
                    ? IncidentAssignmentService.canClaimIncident(incidentUserContext, existingItem)
                    : IncidentAssignmentService.canAssignIncident(incidentUserContext, existingItem, targetId ? { id: targetId, department: existingItem.department } : null);

                if (!canAssignIncident) {
                    const { assignedTo, assignedToId, assignedToEmail, assignedToLoginName, ...rest } = updates;
                    nextUpdates = rest;
                }
            } else if (!canAssign) {
                const { assignedTo, assignedToId, assignedToEmail, assignedToLoginName, ...rest } = updates;
                nextUpdates = rest;
            }
        }

        setWorkItems((prev) => prev.map((item) => item.id === id ? { ...item, ...nextUpdates } : item));
    };

    const renderLoadingState = (message: string): React.ReactElement => (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '300px',
            color: THEME.colors.textSecondary,
            backgroundColor: THEME.colors.panel,
            border: `1px solid ${THEME.colors.border}`,
            borderRadius: '16px',
        }}>
            {message}
        </div>
    );

    const renderWorkspaceHeader = (title: string, description: string): React.ReactElement => (
        <div style={{
            backgroundColor: THEME.colors.panel,
            border: `1px solid ${THEME.colors.border}`,
            borderRadius: '16px',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
        }}>
            <h1 style={{ margin: 0, fontSize: '24px', color: THEME.colors.textStrong }}>{title}</h1>
            <p style={{ margin: '8px 0 0 0', color: THEME.colors.textSecondary, fontSize: '14px' }}>{description}</p>
        </div>
    );

    const renderTaskWorkspaceView = (view: ViewKey): React.ReactElement => {
        if (isLoading) return renderLoadingState('Loading tasks...');

        switch (view) {
            case 'board':
                return <BoardView tasks={taskItems} statuses={TASK_STATUSES} type="task" onTaskClick={handleTaskClick} onNewTask={handleNewTask} onTaskStatusChange={handleTaskStatusChange} />;
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
                <div style={{ transition: 'opacity 180ms ease', opacity: isViewVisible ? 1 : 0 }}>{renderTaskWorkspaceView(displayedView)}</div>
            </div>
        </div>
    );

    const renderDashboardView = (): React.ReactElement => {
        const openTaskCount = taskItems.filter((item) => item.status !== 'Completed').length;
        const openIncidentCount = visibleIncidentItems.filter((item) => item.status !== 'Resolved').length;
        const criticalIncidentCount = visibleIncidentItems.filter((item) => item.severity === 'P1').length;
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

    const renderIncidentDepartmentTabs = (): React.ReactElement => (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '12px 16px', borderBottom: `1px solid ${THEME.colors.border}`, backgroundColor: THEME.colors.panel }}>
            {INCIDENT_DEPARTMENT_TABS.map((department) => {
                const isActive = selectedIncidentDepartment === department;
                const isHovered = hoveredIncidentDepartment === department;
                const count = visibleIncidentItems.filter((item) => normalizeDepartment(item.department) === department).length;

                return (
                    <button
                        key={department}
                        type="button"
                        onClick={() => setSelectedIncidentDepartment(department)}
                        onMouseEnter={() => setHoveredIncidentDepartment(department)}
                        onMouseLeave={() => setHoveredIncidentDepartment(null)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: isActive ? THEME.colors.primary : isHovered ? THEME.colors.primarySoft : 'transparent',
                            color: isActive ? '#ffffff' : THEME.colors.textPrimary,
                            border: isActive ? `1px solid ${THEME.colors.primary}` : `1px solid ${THEME.colors.border}`,
                            borderRadius: '999px',
                            padding: '7px 12px',
                            cursor: 'pointer',
                            fontWeight: isActive ? 700 : 600,
                            fontSize: '13px',
                            transition: 'background-color 160ms ease, color 160ms ease',
                        }}
                    >
                        <span>{department}</span>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '22px',
                            height: '22px',
                            padding: '0 7px',
                            borderRadius: '999px',
                            backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : THEME.colors.background,
                            color: isActive ? '#ffffff' : THEME.colors.textSecondary,
                            fontSize: '11px',
                            fontWeight: 800,
                        }}>
                            {count}
                        </span>
                    </button>
                );
            })}
        </div>
    );

    const renderIncidentsView = (): React.ReactElement => {
        if (isLoading) return renderLoadingState('Loading incidents...');

        return (
            <div style={{ display: 'grid', gap: '16px' }}>
                {renderWorkspaceHeader('Incidents', 'Track operational disruptions with severity, ownership, and impact context.')}
                <div style={{ backgroundColor: THEME.colors.panel, border: `1px solid ${THEME.colors.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                    {renderIncidentDepartmentTabs()}
                    <BoardView tasks={incidentItems} statuses={INCIDENT_STATUSES} type="incident" onTaskClick={handleTaskClick} onNewTask={handleNewTask} onTaskStatusChange={handleTaskStatusChange} />
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
            case 'dashboard':
                return renderDashboardView();
            case 'incidents':
                return renderIncidentsView();
            case 'reports':
                return renderReportsView();
            case 'tasks':
            default:
                return renderTasksView();
        }
    };

    return (
        <AppLayout selectedView={selectedView} onSelectView={setSelectedView}>
            {renderSelectedView()}
            <WorkItemModal
                task={modalTask}
                canAssign={canAssign}
                siteUrl={DATA_SITE}
                context={context}
                currentUserName={currentUserName}
                currentUserSpId={currentUserSpId}
                incidentUserContext={incidentUserContext}
                onSave={handleSaveTask}
                onDelete={handleDeleteTask}
                onClose={handleCloseModal}
            />
        </AppLayout>
    );
};

export default TaskBoard;
