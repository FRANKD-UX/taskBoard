// TaskTypes.ts

export type TaskStatus =
    | 'Unassigned'
    | 'Backlog'
    | 'ThisWeek'
    | 'InProgress'
    | 'Completed';

export type TaskPriority =
    | 'Low'
    | 'Medium'
    | 'High';

export type TaskRequestType =
    | 'Task'
    | 'Incident';

export type TaskDepartment =
    | 'IT'
    | 'Finance'
    | 'Support'
    | 'Operations';

// The two physical office locations the company operates from.
// Albertsdal is the main office; Troyville is the secondary office.
export type TaskSite =
    | 'Albertsdal'
    | 'Troyville';

// The three states a collaboration request can be in.
// Pending = waiting for the invited person to respond.
// Accepted = they said yes — their name shows in "In Collaboration With".
// Declined = they said no — shown in history only, not on the task card.
export type CollaborationStatus = 'Pending' | 'Accepted' | 'Declined';

// A single collaborator as resolved from SharePoint.
export interface ICollaborator {
    id: number | null;
    name: string;
    email: string;
    loginName: string;
}

// A full collaboration request row from the TaskCollaborators SP list.
export interface ICollaborationRequest {
    // The SP list item ID of this request row.
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

    title: string;
    status: TaskStatus;
    priority: TaskPriority;

    // The office site this task originates from.
    // Defaults to 'Albertsdal' (main office) when not specified.
    site: TaskSite;

    assignedTo?: string;
    assignedToId?: number;

    /**
     * The user's email / UPN e.g. "lekau@company.com".
     * PRIMARY identity for resolving the SP user ID at save time.
     */
    assignedToEmail?: string;

    /**
     * Claims-format login name from ClientPeoplePicker.
     * SECONDARY fallback when getByEmail fails.
     */
    assignedToLoginName?: string;

    startDate?: string;
    dueDate?: string;
    createdAt: string;

    requestType: string;
    department: string;

    description?: string;
    createdBy?: string;

    // Accepted collaborators — populated from the Collaborators multi-person
    // column on the Tasks list. Used to render "In Collaboration With".
    collaborators?: ICollaborator[];
}

export interface ITask {
    id: number;

    title: string;
    status: string;
    priority: string;
    site: string;

    assignedTo?: string;
    assignedToId?: number;

    startDate?: string;
    dueDate?: string;

    description?: string;
    requestType: string;
    department: string;
    createdBy?: string;

    collaborators?: ICollaborator[];
}

export type TaskUpdate = Partial<Task>;