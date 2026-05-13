// TaskTypes.ts

export type TaskStatus =
    | 'Unassigned'
    | 'Backlog'
    | 'ThisWeek'
    | 'InProgress'
    | 'Completed';

export type IncidentStatus =
    | 'New'
    | 'Investigating'
    | 'Escalated'
    | 'Resolved';

export type WorkItemStatus = TaskStatus | IncidentStatus;

export type TaskPriority =
    | 'Critical'
    | 'Low'
    | 'Medium'
    | 'High';

export type IncidentSeverity =
    | 'P1'
    | 'P2'
    | 'P3'
    | 'P4';

export type WorkItemType =
    | 'task'
    | 'incident';

export type TaskRequestType =
    | 'Task'
    | 'Incident';

export type TaskDepartment =
    | 'Support'
    | 'IT'
    | 'Accounts'
    | 'Operations'
    | 'Complaints';

export type TaskSite =
    | 'Albertsdal'
    | 'Troyville';

export type CollaborationStatus = 'Pending' | 'Accepted' | 'Declined';

export interface ICollaborator {
    id: number | null;
    name: string;
    email: string;
    loginName: string;
}

export interface IIncidentType {
    id: number;
    title: string;
    severity: IncidentSeverity;
    department?: string;
    isActive?: boolean;
}

export type IncidentSlaStatus = 'OnTrack' | 'AtRisk' | 'Breached' | 'Resolved';

export interface ICollaborationRequest {
    requestId: number;
    taskId: number;
    taskTitle: string;
    collaborator: ICollaborator;
    requestedBy: ICollaborator;
    status: CollaborationStatus;
    requestedAt: string;
    respondedAt?: string;
}

export interface Task {
    id: string;
    type: WorkItemType;

    title: string;
    status: WorkItemStatus;
    priority: TaskPriority;
    site: TaskSite;

    assignedTo?: string;
    assignedToUser?: {
        id: number | null;
        name: string;
        email: string;
    };
    assignedToId?: number | null;
    assignedToEmail?: string;
    assignedToLoginName?: string;

    startDate?: string;
    dueDate?: string;
    createdAt: string;

    requestType: TaskRequestType;
    department: TaskDepartment;

    description?: string;
    createdBy?: string;
    authorId?: number | null;           // <-- ADDED

    severity?: IncidentSeverity;
    impact?: string;
    affectedService?: string;
    incidentTypeId?: number | null;
    incidentType?: IIncidentType | null;
    slaResponseMinutes?: number;
    slaResolutionMinutes?: number;
    responseDueDate?: string;
    resolutionDueDate?: string;
    slaDeadline?: string;
    slaStatus?: IncidentSlaStatus;

    collaborators?: ICollaborator[];
}

export interface ITask {
    id: number;
    type: WorkItemType;

    title: string;
    status: string;
    priority: string;
    site: string;

    assignedTo?: string;
    assignedToUser?: {
        id: number | null;
        name: string;
        email: string;
    };
    assignedToId?: number | null;
    assignedToEmail?: string;
    assignedToLoginName?: string;

    startDate?: string;
    dueDate?: string;
    createdAt?: string;

    description?: string;
    requestType: TaskRequestType;
    department: TaskDepartment;
    createdBy?: string;
    authorId?: number | null;           // <-- ADDED

    severity?: IncidentSeverity;
    impact?: string;
    affectedService?: string;
    incidentTypeId?: number | null;
    incidentType?: IIncidentType | null;
    slaResponseMinutes?: number;
    slaResolutionMinutes?: number;
    responseDueDate?: string;
    resolutionDueDate?: string;
    slaDeadline?: string;
    slaStatus?: IncidentSlaStatus;

    collaborators?: ICollaborator[];
}

export type TaskUpdate = Partial<Task>;
