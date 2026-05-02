import '@pnp/sp/fields';

import { getSP } from '../pnpjsConfig';
import type { IIncidentType, ITask, TaskRequestType, WorkItemType } from '../webparts/taskBoard/components/TaskTypes';

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

const TASK_LIST_TITLE_CANDIDATES = ['WorkItems', 'Tasks', 'Task Management System'];
const ASSIGNEE_FIELD_CANDIDATES = [
    'AssignedTo',
    'Assigned To',
    'AssignedUser',
    'Assigned User',
];
const INCIDENT_TYPE_LIST_TITLE = 'IncidentTypes';
const INCIDENT_LOG_LIST_TITLE = 'IncidentLogs';
const INCIDENT_TYPE_FIELD_CANDIDATES = [
    'IncidentType',
    'Incident Type',
];
const INCIDENT_LOG_WORKITEM_FIELD_CANDIDATES = ['WorkItemId', 'Work Item', 'WorkItem'];
const INCIDENT_LOG_ACTION_FIELD_CANDIDATES = ['Action'];
const INCIDENT_LOG_TIMESTAMP_FIELD_CANDIDATES = ['Timestamp'];
const INCIDENT_LOG_NEWVALUE_FIELD_CANDIDATES = ['NewValue', 'New Value'];

export class TaskService {
    private assigneeFieldConfigPromise?: Promise<IAssigneeFieldConfig>;
    private incidentTypeFieldNamePromise?: Promise<string | null>;
    private listTitlePromise?: Promise<string>;
    private listFieldNamesPromise?: Promise<Set<string>>;

    public async getIncidentTypes(): Promise<IIncidentType[]> {
        const sp = getSP();

        try {
            const items = await sp.web.lists
                .getByTitle(INCIDENT_TYPE_LIST_TITLE)
                .items.select('Id', 'Title', 'Severity', 'IsActive')
                .filter('IsActive eq 1')
                .orderBy('Title', true)();

            return items
                .filter((item: any) => item?.Title && item?.Severity)
                .map((item: any) => ({
                    id: item.Id,
                    title: item.Title,
                    severity: item.Severity,
                    department: item.Department,
                    isActive: item.IsActive === true || item.IsActive === 1,
                }));
        } catch (error) {
            console.error('[TaskService] failed to load IncidentTypes:', error);
            return [];
        }
    }

    public async getTasks(type?: WorkItemType): Promise<ITask[]> {
        const sp = getSP();
        const listTitle = await this.getTaskListTitle();
        const assigneeField = await this.getAssigneeFieldConfig();
        const incidentTypeFieldName = await this.getIncidentTypeFieldName();
        const assigneeLookupField = `${assigneeField.internalName}Id`;

        const mapItem = (item: any): ITask => {
            const assignee = this.getPrimaryAssignee(item[assigneeField.internalName] ?? item.AssignedTo);
            const fallbackAssigneeId = this.getPrimaryAssigneeId(item[assigneeLookupField] ?? item.AssignedToId);
            const rawIncidentType = incidentTypeFieldName ? item[incidentTypeFieldName] : undefined;
            const incidentType = this.getIncidentTypeValue(rawIncidentType);
            const requestType = this.normalizeRequestType(item.RequestType ?? item.Type);
            const workItemType = this.toWorkItemType(requestType);

            return {
                id: item.Id,
                type: workItemType,
                title: item.Title || '',
                status: item.Status || (workItemType === 'incident' ? 'New' : 'Unassigned'),
                priority: item.Priority || 'Medium',
                // Default to Albertsdal (main office) when the field is blank —
                // this covers tasks created before Site was added to the list.
                site: item.Site || 'Albertsdal',
                assignedTo: assignee?.Title,
                assignedToId: assignee?.Id ?? fallbackAssigneeId ?? null,
                assignedToEmail: assignee?.Email ?? assignee?.EMail,
                assignedToLoginName: assignee?.LoginName,
                startDate: item.StartDate,
                dueDate: item.DueDate,
                createdAt: item.Created,
                description: item.Description,
                requestType,
                department: item.Department || 'IT',
                severity: item.Severity,
                impact: item.Impact,
                affectedService: item.AffectedService,
                incidentTypeId: incidentType?.id ?? this.getPrimaryLookupId(item[incidentTypeFieldName ? `${incidentTypeFieldName}Id` : '']),
                incidentType,
                slaResponseMinutes: item.SLAResponseMinutes,
                slaResolutionMinutes: item.SLAResolutionMinutes,
                slaDeadline: item.SLADeadline,
                slaStatus: item.SLAStatus,
            };
        };

        try {
            const selectFields: string[] = [
                'Id',
                'Title',
                'Status',
                'Priority',
                'Site',
                'StartDate',
                'DueDate',
                'Created',
                'Description',
                'RequestType',
                'Department',
                'Severity',
                'Impact',
                'AffectedService',
                'SLAResponseMinutes',
                'SLAResolutionMinutes',
                'SLADeadline',
                'SLAStatus',
                `${assigneeField.internalName}/Title`,
                `${assigneeField.internalName}/Id`,
                `${assigneeField.internalName}/EMail`,
                assigneeLookupField,
            ];
            const expandFields: string[] = [assigneeField.internalName];

            if (incidentTypeFieldName) {
                selectFields.push(
                    `${incidentTypeFieldName}/Id`,
                    `${incidentTypeFieldName}/Title`,
                    `${incidentTypeFieldName}/Severity`,
                    `${incidentTypeFieldName}/Department`,
                    `${incidentTypeFieldName}Id`
                );
                expandFields.push(incidentTypeFieldName);
            }

            const items = await sp.web.lists
                .getByTitle(listTitle)
                .items.select(...selectFields)
                .expand(...expandFields)
                .top(500)();

            const mappedItems = items.map(mapItem);
            return type ? mappedItems.filter((item) => item.type === type) : mappedItems;
        } catch (primaryError) {
            console.warn('TaskService.getTasks: full typed query failed, trying minimal expanded query.', primaryError);

            try {
                const minimalSelectFields: string[] = [
                    'Id',
                    'Title',
                    'Status',
                    'Priority',
                    'Site',
                    'StartDate',
                    'DueDate',
                    'Created',
                    'Description',
                    'RequestType',
                    'Department',
                    'Severity',
                    'Impact',
                    'AffectedService',
                    'SLAResponseMinutes',
                    'SLAResolutionMinutes',
                    'SLADeadline',
                    'SLAStatus',
                    `${assigneeField.internalName}/Title`,
                    `${assigneeField.internalName}/Id`,
                    assigneeLookupField,
                ];
                const minimalExpandFields: string[] = [assigneeField.internalName];

                if (incidentTypeFieldName) {
                    minimalSelectFields.push(
                        `${incidentTypeFieldName}/Id`,
                        `${incidentTypeFieldName}/Title`,
                        `${incidentTypeFieldName}/Severity`,
                        `${incidentTypeFieldName}/Department`,
                        `${incidentTypeFieldName}Id`
                    );
                    minimalExpandFields.push(incidentTypeFieldName);
                }

                const minimalItems = await sp.web.lists
                    .getByTitle(listTitle)
                    .items.select(...minimalSelectFields)
                    .expand(...minimalExpandFields)
                    .top(500)();

                const mappedItems = minimalItems.map(mapItem);
                return type ? mappedItems.filter((item) => item.type === type) : mappedItems;
            } catch (minimalError) {
                console.warn('TaskService.getTasks: minimal expanded query failed, falling back to broad item fetch.', minimalError);
            }

            const fallbackItems = await sp.web.lists
                .getByTitle(listTitle)
                .items
                .top(500)();

            const mappedItems = fallbackItems.map(mapItem);
            return type ? mappedItems.filter((item) => item.type === type) : mappedItems;
        }
    }

    public async createTask(task: any): Promise<any> {
        const sp = getSP();
        const listTitle = await this.getTaskListTitle();
        const availableFields = await this.getListFieldNames();
        const incidentTypeFieldName = await this.getIncidentTypeFieldName();

        const payload: any = {
            Title: task.title,
            Status: task.status,
            Priority: task.priority,
            Site: task.site,
            StartDate: this.validateDate(task.startDate),
            DueDate: this.validateDate(task.dueDate),
            Description: task.description,
            RequestType: task.requestType,
            Department: task.department,
        };
        this.applyFieldIfAvailable(payload, availableFields, 'Type', task.requestType);
        this.applyFieldIfAvailable(payload, availableFields, 'Severity', task.severity ?? null);
        this.applyFieldIfAvailable(payload, availableFields, 'Impact', task.impact ?? null);
        this.applyFieldIfAvailable(payload, availableFields, 'AffectedService', task.affectedService ?? null);
        this.applyLookupFieldIfAvailable(payload, incidentTypeFieldName, task.incidentTypeId ?? null);
        this.applyFieldIfAvailable(payload, availableFields, 'SLAResponseMinutes', task.slaResponseMinutes ?? null);
        this.applyFieldIfAvailable(payload, availableFields, 'SLAResolutionMinutes', task.slaResolutionMinutes ?? null);
        this.applyFieldIfAvailable(payload, availableFields, 'SLADeadline', this.validateDateTime(task.slaDeadline));
        this.applyFieldIfAvailable(payload, availableFields, 'SLAStatus', task.slaStatus ?? null);

        const assigneeField = await this.getAssigneeFieldConfig();
        this.applyAssigneeToPayload(payload, task.assignedToId, assigneeField);

        const result = await sp.web.lists
            .getByTitle(listTitle)
            .items.add(payload);

        // PnP v2 returns { data: { Id, ... }, item }
        // PnP v3 returns { data: { Id, ID, id, ... } } depending on SP version
        // We walk every known key shape to be safe.
        const raw = result as any;

        const createdId: number | undefined =
            raw?.data?.Id ??
            raw?.data?.ID ??
            raw?.data?.id ??
            raw?.Id ??
            raw?.ID ??
            raw?.id ??
            raw?.item?.Id ??
            raw?.item?.ID ??
            undefined;

        if (createdId && task.requestType === 'Incident') {
            try {
                await this.logIncidentCreation(createdId, task);
            } catch (logError) {
                console.warn('TaskService.createTask: incident audit log failed.', logError);
            }
        }

        return {
            ...(raw?.data ?? raw),
            id: createdId,
        };
    }

    public async updateTask(id: number, updates: Partial<ITask>): Promise<void> {
        const sp = getSP();
        const listTitle = await this.getTaskListTitle();
        const availableFields = await this.getListFieldNames();
        const incidentTypeFieldName = await this.getIncidentTypeFieldName();

        const payload: Record<string, any> = {
            Title: updates.title,
            Status: updates.status,
            Priority: updates.priority,
            Site: updates.site,
            StartDate: this.validateDate(updates.startDate),
            DueDate: this.validateDate(updates.dueDate),
            Description: updates.description,
            RequestType: updates.requestType,
            Department: updates.department,
        };
        if (updates.requestType !== undefined) {
            this.applyFieldIfAvailable(payload, availableFields, 'Type', updates.requestType);
        }
        this.applyFieldIfAvailable(payload, availableFields, 'Severity', updates.severity ?? null);
        this.applyFieldIfAvailable(payload, availableFields, 'Impact', updates.impact ?? null);
        this.applyFieldIfAvailable(payload, availableFields, 'AffectedService', updates.affectedService ?? null);
        if (updates.incidentTypeId !== undefined || updates.requestType === 'Task') {
            this.applyLookupFieldIfAvailable(
                payload,
                incidentTypeFieldName,
                updates.requestType === 'Task' ? null : updates.incidentTypeId ?? null
            );
        }
        if (updates.slaResponseMinutes !== undefined || updates.requestType === 'Task') {
            this.applyFieldIfAvailable(payload, availableFields, 'SLAResponseMinutes', updates.slaResponseMinutes ?? null);
        }
        if (updates.slaResolutionMinutes !== undefined || updates.requestType === 'Task') {
            this.applyFieldIfAvailable(payload, availableFields, 'SLAResolutionMinutes', updates.slaResolutionMinutes ?? null);
        }
        if (updates.slaDeadline !== undefined || updates.requestType === 'Task') {
            this.applyFieldIfAvailable(payload, availableFields, 'SLADeadline', this.validateDateTime(updates.slaDeadline));
        }
        if (updates.slaStatus !== undefined || updates.requestType === 'Task') {
            this.applyFieldIfAvailable(payload, availableFields, 'SLAStatus', updates.slaStatus ?? null);
        }

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

    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------

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

    private validateDateTime(value?: string): string | null {
        if (!value) return null;
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed.toISOString();
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
                // Try the next candidate.
            }
        }

        return TASK_LIST_TITLE_CANDIDATES[0];
    }

    private async getListFieldNames(): Promise<Set<string>> {
        if (!this.listFieldNamesPromise) {
            this.listFieldNamesPromise = this.loadListFieldNames();
        }
        return this.listFieldNamesPromise;
    }

    private async getIncidentTypeFieldName(): Promise<string | null> {
        if (!this.incidentTypeFieldNamePromise) {
            this.incidentTypeFieldNamePromise = this.loadIncidentTypeFieldName();
        }
        return this.incidentTypeFieldNamePromise;
    }

    private async loadListFieldNames(): Promise<Set<string>> {
        const sp = getSP();
        const listTitle = await this.getTaskListTitle();
        const fields = await sp.web.lists
            .getByTitle(listTitle)
            .fields.select('InternalName')();

        return new Set(fields.map((field: any) => field.InternalName));
    }

    private async loadIncidentTypeFieldName(): Promise<string | null> {
        const sp = getSP();
        const listTitle = await this.getTaskListTitle();
        const fields = await sp.web.lists
            .getByTitle(listTitle)
            .fields.select('InternalName', 'Title', 'TypeAsString')();

        const field = fields.find((candidate: any) => {
            if (!candidate?.InternalName) return false;
            if (candidate.TypeAsString !== 'Lookup' && candidate.TypeAsString !== 'LookupMulti') return false;

            const normalizedInternalName = this.normalizeFieldName(candidate.InternalName);
            const normalizedTitle = this.normalizeFieldName(candidate.Title);

            return INCIDENT_TYPE_FIELD_CANDIDATES.some((name) => {
                const normalizedCandidate = this.normalizeFieldName(name);
                return normalizedInternalName === normalizedCandidate || normalizedTitle === normalizedCandidate;
            });
        });

        return field?.InternalName ?? null;
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
            if (!candidate?.InternalName) return false;
            if (candidate.TypeAsString !== 'User' && candidate.TypeAsString !== 'UserMulti') return false;

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
            isMulti: (field as any).AllowMultipleValues === true || field.TypeAsString === 'UserMulti',
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

        payload[`${fieldName}Id`] = { results: [assignedToId] };
    }

    private applyFieldIfAvailable(
        payload: Record<string, any>,
        availableFields: Set<string>,
        fieldName: string,
        value: string | number | null | undefined
    ): void {
        if (!availableFields.has(fieldName)) return;
        payload[fieldName] = value ?? null;
    }

    private applyLookupFieldIfAvailable(
        payload: Record<string, any>,
        fieldName: string | null,
        lookupId: number | null
    ): void {
        if (!fieldName) return;
        payload[`${fieldName}Id`] = lookupId;
    }

    private async logIncidentCreation(workItemId: number, task: any): Promise<void> {
        const sp = getSP();
        const fields = await sp.web.lists
            .getByTitle(INCIDENT_LOG_LIST_TITLE)
            .fields.select('InternalName', 'Title', 'TypeAsString')();

        const workItemField = this.findFieldByCandidates(fields, INCIDENT_LOG_WORKITEM_FIELD_CANDIDATES);
        const actionField = this.findFieldByCandidates(fields, INCIDENT_LOG_ACTION_FIELD_CANDIDATES);
        const timestampField = this.findFieldByCandidates(fields, INCIDENT_LOG_TIMESTAMP_FIELD_CANDIDATES);
        const newValueField = this.findFieldByCandidates(fields, INCIDENT_LOG_NEWVALUE_FIELD_CANDIDATES);

        const payload: Record<string, any> = {
            Title: 'Incident Created',
        };

        if (workItemField) {
            if (workItemField.TypeAsString === 'Lookup' || workItemField.TypeAsString === 'LookupMulti') {
                payload[`${workItemField.InternalName}Id`] = workItemId;
            } else {
                payload[workItemField.InternalName] = workItemId;
            }
        }

        if (actionField) {
            payload[actionField.InternalName] = 'Created';
        }

        if (timestampField) {
            payload[timestampField.InternalName] = new Date().toISOString();
        }

        if (newValueField) {
            payload[newValueField.InternalName] = JSON.stringify({
                severity: task.severity ?? null,
                incidentTypeId: task.incidentTypeId ?? null,
                incidentType: task.incidentType?.title ?? null,
            });
        }

        await sp.web.lists
            .getByTitle(INCIDENT_LOG_LIST_TITLE)
            .items.add(payload);
    }

    private getPrimaryAssignee(value: ISPUserValue | ISPUserValue[] | undefined): ISPUserValue | undefined {
        if (!value) return undefined;
        return Array.isArray(value) ? value[0] : value;
    }

    private getPrimaryAssigneeId(value: number | number[] | { results?: number[] } | undefined): number | undefined {
        if (typeof value === 'number') return value;
        if (Array.isArray(value)) return value[0];
        return value?.results?.[0];
    }

    private getPrimaryLookupId(value: number | number[] | { results?: number[] } | undefined): number | undefined {
        if (typeof value === 'number') return value;
        if (Array.isArray(value)) return value[0];
        return value?.results?.[0];
    }

    private findFieldByCandidates(fields: any[], candidates: string[]): any | undefined {
        return fields.find((candidate: any) => {
            if (!candidate?.InternalName) return false;

            const normalizedInternalName = this.normalizeFieldName(candidate.InternalName);
            const normalizedTitle = this.normalizeFieldName(candidate.Title);

            return candidates.some((name) => {
                const normalizedCandidate = this.normalizeFieldName(name);
                return normalizedInternalName === normalizedCandidate || normalizedTitle === normalizedCandidate;
            });
        });
    }

    private getIncidentTypeValue(value: any): IIncidentType | null {
        if (!value) return null;

        const item = Array.isArray(value) ? value[0] : value;
        if (!item?.Id || !item?.Title) return null;

        return {
            id: item.Id,
            title: item.Title,
            severity: item.Severity,
            department: item.Department,
        };
    }

    private normalizeFieldName(value?: string): string {
        return (value ?? '')
            .replace(/_x0020_/gi, '')
            .replace(/\s+/g, '')
            .toLowerCase();
    }

    private normalizeRequestType(value?: string): TaskRequestType {
        return (value ?? '').toLowerCase() === 'incident' ? 'Incident' : 'Task';
    }

    private toWorkItemType(requestType: TaskRequestType): WorkItemType {
        return requestType === 'Incident' ? 'incident' : 'task';
    }
}
