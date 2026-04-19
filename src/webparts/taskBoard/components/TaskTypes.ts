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
    | 'Operations';


export interface Task {
    id: string;

    title: string;
    status: TaskStatus;
    priority: TaskPriority;

    assignedTo?: string;
    assignedToId?: number;

    /**
     * The user's email / UPN e.g. "lekau@company.com".
     * PRIMARY identity for resolving the SP user ID at save time.
     * sp.web.siteUsers.getByEmail() is the most reliable resolution method
     * in Azure AD-synced SharePoint Online tenants.
     */
    assignedToEmail?: string;

    /**
     * Claims-format login name from ClientPeoplePicker
     * e.g. "i:0#.f|membership|lekau@company.com".
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
}


export interface ITask {
    id: number;

    title: string;
    status: string;
    priority: string;

    assignedTo?: string;
    assignedToId?: number;

    startDate?: string;
    dueDate?: string;

    description?: string;
    requestType: string;
    department: string;
    createdBy?: string;
}

export type TaskUpdate = Partial<Task>;