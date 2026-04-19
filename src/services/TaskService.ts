import '@pnp/sp/fields';

import { getSP } from '../pnpjsConfig';

export interface ITask {
    id: number;
    title: string;
    status: string;
    priority: string;
    assignedTo?: string;
    assignedToId?: number | null;
    assignedToEmail?: string;
    assignedToLoginName?: string;
    startDate?: string;
    dueDate?: string;
    description?: string;
    requestType: string;
    department: string;
}

interface IAssigneeFieldConfig {
    internalName: string;
    isMulti: boolean;
}

interface ISPUserValue {
    Id?: number;
    Title?: string;
    Email?: string;
    EMail?: string;
    LoginName?: string;
}

const TASK_LIST_TITLE_CANDIDATES = ['Tasks', 'Task Management System'];
const ASSIGNEE_FIELD_CANDIDATES = [
    'AssignedTo',
    'Assigned To',
    'AssignedUser',
    'Assigned User'
];

export class TaskService {
    private assigneeFieldConfigPromise?: Promise<IAssigneeFieldConfig>;
    private listTitlePromise?: Promise<string>;

    public async getTasks(): Promise<ITask[]> {
        const sp = getSP();
        const listTitle = await this.getTaskListTitle();
        const assigneeField = await this.getAssigneeFieldConfig();
        const assigneeLookupField = `${assigneeField.internalName}Id`;

        const items = await sp.web.lists
            .getByTitle(listTitle)
            .items.select(
                'Id',
                'Title',
                'Status',
                'Priority',
                'StartDate',
                'DueDate',
                'Description',
                'RequestType',
                'Department',
                `${assigneeField.internalName}/Title`,
                `${assigneeField.internalName}/Id`,
                `${assigneeField.internalName}/Email`,
                `${assigneeField.internalName}/EMail`,
                `${assigneeField.internalName}/LoginName`,
                assigneeLookupField
            )
            .expand(assigneeField.internalName)();

        return items.map((item: any) => {
            const assignee = this.getPrimaryAssignee(item[assigneeField.internalName]);
            const fallbackAssigneeId = this.getPrimaryAssigneeId(item[assigneeLookupField]);

            return {
                id: item.Id,
                title: item.Title,
                status: item.Status,
                priority: item.Priority,
                assignedTo: assignee?.Title,
                assignedToId: assignee?.Id ?? fallbackAssigneeId ?? null,
                assignedToEmail: assignee?.Email ?? assignee?.EMail,
                assignedToLoginName: assignee?.LoginName,
                startDate: item.StartDate,
                dueDate: item.DueDate,
                description: item.Description,
                requestType: item.RequestType,
                department: item.Department
            };
        });
    }

    public async createTask(task: any): Promise<any> {
        const sp = getSP();
        const listTitle = await this.getTaskListTitle();

        const payload: any = {
            Title: task.title,
            Status: task.status,
            Priority: task.priority,
            StartDate: this.validateDate(task.startDate),
            DueDate: this.validateDate(task.dueDate),
            Description: task.description,
            RequestType: task.requestType,
            Department: task.department
        };

        const assigneeField = await this.getAssigneeFieldConfig();
        this.applyAssigneeToPayload(payload, task.assignedToId, assigneeField);

        const result = await sp.web.lists
            .getByTitle(listTitle)
            .items.add(payload);

        return {
            ...result.data,
            id: result.data.Id ?? result.data.id
        };
    }

    public async updateTask(id: number, updates: Partial<ITask>): Promise<void> {
        const sp = getSP();
        const listTitle = await this.getTaskListTitle();

        const payload: Record<string, any> = {
            Title: updates.title,
            Status: updates.status,
            Priority: updates.priority,
            StartDate: this.validateDate(updates.startDate),
            DueDate: this.validateDate(updates.dueDate),
            Description: updates.description,
            RequestType: updates.requestType,
            Department: updates.department
        };

        const assigneeField = await this.getAssigneeFieldConfig();
        if (updates.assignedToId !== undefined) {
            this.applyAssigneeToPayload(payload, updates.assignedToId, assigneeField);
        }

        await sp.web.lists.getByTitle(listTitle).items.getById(id).update(payload);
    }

    public async deleteTask(id: number): Promise<void> {
        const sp = getSP();
        const listTitle = await this.getTaskListTitle();
        await sp.web.lists.getByTitle(listTitle).items.getById(id).delete();
    }

    private validateDate(date?: string): string | null {
        if (!date) return null;

        const dateOnlyMatch = date.match(/^\d{4}-\d{2}-\d{2}/);
        if (dateOnlyMatch) return dateOnlyMatch[0];

        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }

        return null;
    }

    private async getTaskListTitle(): Promise<string> {
        if (!this.listTitlePromise) {
            this.listTitlePromise = this.resolveTaskListTitle();
        }

        return this.listTitlePromise;
    }

    private async resolveTaskListTitle(): Promise<string> {
        const sp = getSP();

        for (const listTitle of TASK_LIST_TITLE_CANDIDATES) {
            try {
                await sp.web.lists.getByTitle(listTitle).select('Id')();
                return listTitle;
            } catch {
                // Try the next candidate list title.
            }
        }

        return TASK_LIST_TITLE_CANDIDATES[0];
    }

    private async getAssigneeFieldConfig(): Promise<IAssigneeFieldConfig> {
        if (!this.assigneeFieldConfigPromise) {
            this.assigneeFieldConfigPromise = this.loadAssigneeFieldConfig();
        }

        return this.assigneeFieldConfigPromise;
    }

    private async loadAssigneeFieldConfig(): Promise<IAssigneeFieldConfig> {
        const sp = getSP();
        const listTitle = await this.getTaskListTitle();
        const fields = await sp.web.lists
            .getByTitle(listTitle)
            .fields.select('InternalName', 'Title', 'TypeAsString', 'AllowMultipleValues')();

        const field = fields.find((candidate: any) => {
            if (!candidate?.InternalName) {
                return false;
            }

            if (candidate.TypeAsString !== 'User' && candidate.TypeAsString !== 'UserMulti') {
                return false;
            }

            const normalizedInternalName = this.normalizeFieldName(candidate.InternalName);
            const normalizedTitle = this.normalizeFieldName(candidate.Title);

            return ASSIGNEE_FIELD_CANDIDATES.some((name) => {
                const normalizedCandidate = this.normalizeFieldName(name);
                return normalizedInternalName === normalizedCandidate || normalizedTitle === normalizedCandidate;
            });
        });

        if (!field) {
            return { internalName: 'AssignedTo', isMulti: false };
        }

        return {
            internalName: field.InternalName,
            isMulti: (field as any).AllowMultipleValues === true || field.TypeAsString === 'UserMulti'
        };
    }

    private applyAssigneeToPayload(
        payload: Record<string, any>,
        assignedToId: number | null | undefined,
        fieldConfig: IAssigneeFieldConfig
    ): void {
        const fieldName = fieldConfig.internalName;

        if (assignedToId === null || assignedToId === undefined) {
            payload[`${fieldName}Id`] = null;
            return;
        }

        if (!fieldConfig.isMulti) {
            payload[`${fieldName}Id`] = assignedToId;
            return;
        }

        payload[`${fieldName}Id`] = {
            results: [assignedToId]
        };
    }

    private getPrimaryAssignee(value: ISPUserValue | ISPUserValue[] | undefined): ISPUserValue | undefined {
        if (!value) {
            return undefined;
        }

        return Array.isArray(value) ? value[0] : value;
    }

    private getPrimaryAssigneeId(value: number | number[] | { results?: number[] } | undefined): number | undefined {
        if (typeof value === 'number') {
            return value;
        }

        if (Array.isArray(value)) {
            return value[0];
        }

        return value?.results?.[0];
    }

    private normalizeFieldName(value?: string): string {
        return (value ?? '')
            .replace(/_x0020_/gi, '')
            .replace(/\s+/g, '')
            .toLowerCase();
    }
}