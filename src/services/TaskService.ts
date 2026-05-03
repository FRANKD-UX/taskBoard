import '@pnp/sp/fields';

import { getSP } from '../pnpjsConfig';
import type { IIncidentType, ITask, TaskRequestType, WorkItemType } from '../webparts/taskBoard/components/TaskTypes';
import { buildIncidentSla, getPriorityFromSeverity } from '../webparts/taskBoard/components/incidentSla';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface IAssigneeFieldConfig {
    internalName: string;
    isMulti: boolean;
}

interface ISPUserValue {
    Id?: number;
    Title?: string;
    Email?: string;
    EMail?: string;
}

// ---------------------------------------------------------------------------
// Constants — list and field name candidates
//
// We use candidate arrays so the service can locate fields even when SP
// internal names differ slightly across environments. The first matching
// candidate wins. Order matters — put your most likely name first.
// ---------------------------------------------------------------------------

const TASK_LIST_TITLE_CANDIDATES = ['WorkItems', 'Tasks', 'Task Management System'];

const ASSIGNEE_FIELD_CANDIDATES = [
    'AssignedTo',
    'Assigned To',
    'AssignedUser',
    'Assigned User',
];

const INCIDENT_TYPE_LIST_TITLE = 'IncidentTypes';
const INCIDENT_LOG_LIST_TITLE = 'IncidentLogs';
const USER_ROLE_LIST_TITLE = 'UserRoles';

const INCIDENT_TYPE_FIELD_CANDIDATES = ['IncidentType', 'Incident Type'];

const INCIDENT_LOG_WORKITEM_FIELD_CANDIDATES = ['WorkItemId', 'Work Item', 'WorkItem'];
const INCIDENT_LOG_ACTION_FIELD_CANDIDATES = ['Action'];
const INCIDENT_LOG_FIELDNAME_FIELD_CANDIDATES = ['FieldName', 'Field Name'];
const INCIDENT_LOG_OLDVALUE_FIELD_CANDIDATES = ['OldValue', 'Old Value'];
const INCIDENT_LOG_TIMESTAMP_FIELD_CANDIDATES = ['Timestamp'];
const INCIDENT_LOG_PERFORMEDBY_FIELD_CANDIDATES = ['PerformedBy', 'Performed By'];
const INCIDENT_LOG_NEWVALUE_FIELD_CANDIDATES = ['NewValue', 'New Value'];

// ---------------------------------------------------------------------------
// Field lists for getTasks
//
// TASK_REQUIRED_SELECT_FIELDS — always requested; these are standard SP
// built-in columns or columns every environment is expected to have.
//
// TASK_OPTIONAL_SELECT_FIELDS — only added to the query when the field
// actually exists on the list. This prevents the 400 Bad Request SP returns
// when you ask for a column that hasn't been created yet.
// ---------------------------------------------------------------------------

const TASK_REQUIRED_SELECT_FIELDS: string[] = [
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
    'Type',
    'Department',
    'AssignedTo/Id',
    'AssignedTo/Title',
    'AssignedTo/EMail',
    'AssignedToId',
];

// These are columns your list may or may not have yet. The service checks
// the list's field schema and only includes the ones that actually exist.
const TASK_OPTIONAL_SELECT_FIELDS: string[] = [
    'Severity',
    'Impact',
    'AffectedService',
    'SLAResponseMinutes',
    'SLAResolutionMinutes',
    'ResponseDueDate',
    'ResolutionDueDate',
    'SLADeadline',
    'SLAStatus',
];

const TASK_CORE_EXPAND_FIELDS: string[] = ['AssignedTo'];

// ---------------------------------------------------------------------------
// TaskService
// ---------------------------------------------------------------------------

export class TaskService {

    // Promise-cache fields — resolved once, then reused for the lifetime of
    // this service instance. This avoids redundant network round trips every
    // time a method needs list or field metadata.
    private assigneeFieldConfigPromise?: Promise<IAssigneeFieldConfig>;
    private incidentTypeFieldNamePromise?: Promise<string | null>;
    private listTitlePromise?: Promise<string>;
    private listFieldNamesPromise?: Promise<Set<string>>;

    // Cached incident log field schema — fetched once and shared across all
    // addIncidentLog calls so we don't hit /_api/fields on every audit entry.
    private incidentLogFieldSchemaPromise?: Promise<any[]>;

    // ---------------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------------

    public async getIncidentTypes(): Promise<IIncidentType[]> {
        const sp = getSP();

        try {
            const items = await sp.web.lists
                .getByTitle(INCIDENT_TYPE_LIST_TITLE)
                .items.select('Id', 'Title', 'Severity', 'Department', 'IsActive')
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

    public async checkAndEscalateSLAs(): Promise<void> {
        const sp = getSP();
        const listTitle = await this.getTaskListTitle();
        const now = new Date();

        console.log('SLA CHECK START');

        const items = await sp.web.lists
            .getByTitle(listTitle)
            .items
            .select(
                'Id',
                'Title',
                'Department',
                'AssignedTo/Id',
                'AssignedTo/Title',
                'AssignedTo/EMail',
                'AssignedToId',
                'SLADeadline',
                'SLAStatus',
                'RequestType',
                'Type'
            )
            .expand('AssignedTo')
            .filter("SLADeadline ne null and (SLAStatus ne 'Breached' or SLAStatus eq null)")
            .top(500)();

        for (const item of items) {
            try {
                const requestType = this.normalizeRequestType(item.RequestType ?? item.Type);
                if (requestType !== 'Incident') continue;

                const deadline = item.SLADeadline ? new Date(item.SLADeadline) : null;
                if (!deadline || isNaN(deadline.getTime())) continue;
                if (now <= deadline) continue;

                console.log(`BREACH DETECTED: ${item.Id}`);

                const department = item.Department ?? '';
                const lead = await this.getDepartmentLead(department);
                if (!lead) {
                    console.warn(`NO LEAD FOUND for Department: ${department}`);
                    continue;
                }

                const previousAssignedTo = this.getPrimaryAssignee(item.AssignedTo);
                const previousName = previousAssignedTo?.Title ?? 'Unassigned';

                await sp.web.lists
                    .getByTitle(listTitle)
                    .items
                    .getById(item.Id)
                    .update({
                        AssignedToId: lead.id,
                        SLAStatus: 'Breached',
                    });

                console.log(`ESCALATED TO: ${lead.name}`);

                await this.logSlaEscalation(item.Id, previousName, lead.name);
            } catch (error) {
                console.error('TaskService.checkAndEscalateSLAs: escalation failed', error);
            }
        }
    }

    public async getTasks(type?: WorkItemType): Promise<ITask[]> {
        const sp = getSP();
        const listTitle = await this.getTaskListTitle();
        const assigneeField = await this.getAssigneeFieldConfig();
        const incidentTypeFieldName = await this.getIncidentTypeFieldName();

        // Discover which optional SLA/incident fields actually exist on this
        // list before building the select query. Requesting a field that does
        // not exist causes SP to return a hard 400 Bad Request — even if every
        // other field in the query is valid.
        const existingFields = await this.getListFieldNames();
        const presentOptionalFields = TASK_OPTIONAL_SELECT_FIELDS.filter(
            (field) => existingFields.has(field)
        );

        if (presentOptionalFields.length < TASK_OPTIONAL_SELECT_FIELDS.length) {
            const missing = TASK_OPTIONAL_SELECT_FIELDS.filter((f) => !existingFields.has(f));
            console.info(
                'TaskService.getTasks: the following optional columns are not on the list and will be skipped:',
                missing.join(', ')
            );
        }

        // Build the final select list: required fields + present optional fields
        // + the dynamic incident type lookup ID field if one was discovered.
        const selectFields: string[] = [
            ...TASK_REQUIRED_SELECT_FIELDS,
            ...presentOptionalFields,
            ...(incidentTypeFieldName ? [`${incidentTypeFieldName}Id`] : []),
        ];

        const mapItem = (item: any): ITask => {
            const assignee = this.getPrimaryAssignee(item.AssignedTo);
            const assignedToUser = {
                id: assignee?.Id ?? null,
                name: assignee?.Title ?? '',
                email: assignee?.Email ?? assignee?.EMail ?? '',
            };

            // AssignedToId can come back from SP as a plain number (single User)
            // or as { results: [id] } (UserMulti). getPrimaryAssigneeId handles both.
            const fallbackAssigneeId = this.getPrimaryAssigneeId(item.AssignedToId);
            const requestType = this.normalizeRequestType(item.RequestType ?? item.Type);
            const workItemType = this.toWorkItemType(requestType);

            const incidentTypeLookupKey = incidentTypeFieldName
                ? `${incidentTypeFieldName}Id`
                : '';

            return {
                id: item.Id,
                type: workItemType,
                title: item.Title || '',
                status: item.Status || (workItemType === 'incident' ? 'New' : 'Unassigned'),
                priority: item.Priority || 'Medium',
                // Default to Albertsdal (main office) when Site is blank —
                // covers tasks created before the Site column was added.
                site: item.Site || 'Albertsdal',
                assignedTo: assignedToUser.name,
                assignedToUser,
                assignedToId: assignedToUser.id ?? fallbackAssigneeId ?? null,
                assignedToEmail: assignedToUser.email,
                assignedToLoginName: undefined,
                startDate: item.StartDate,
                dueDate: item.DueDate,
                createdAt: item.Created,
                description: item.Description,
                requestType,
                department: item.Department || 'IT',
                severity: item.Severity,
                impact: item.Impact,
                affectedService: item.AffectedService,
                incidentTypeId: incidentTypeLookupKey
                    ? this.getPrimaryLookupId(item[incidentTypeLookupKey])
                    : undefined,
                incidentType: null,
                slaResponseMinutes: item.SLAResponseMinutes,
                slaResolutionMinutes: item.SLAResolutionMinutes,
                responseDueDate: item.ResponseDueDate,
                resolutionDueDate: item.ResolutionDueDate,
                slaDeadline: item.SLADeadline,
                slaStatus: item.SLAStatus,
            };
        };

        // Primary attempt — full field list with User expansion.
        try {
            const items = await sp.web.lists
                .getByTitle(listTitle)
                .items.select(...selectFields)
                .expand(...TASK_CORE_EXPAND_FIELDS)
                .top(500)();

            const mappedItems = items.map(mapItem);
            return type ? mappedItems.filter((item) => item.type === type) : mappedItems;
        } catch (primaryError) {
            console.warn(
                'TaskService.getTasks: full select query failed, trying without User expansion.',
                primaryError
            );
        }

        // Fallback — drop the User expansion and pull a smaller field set.
        // This handles SP environments that restrict certain expanded selects.
        // NOTE: AssignedTo will be missing here; assignedToUser will be empty.
        try {
            const fallbackSelectFields = [
                'Id', 'Title', 'Status', 'Priority', 'Site',
                'StartDate', 'DueDate', 'Created', 'Description',
                'RequestType', 'Type', 'Department', 'Severity',
                'AssignedToId',
            ];

            const items = await sp.web.lists
                .getByTitle(listTitle)
                .items.select(...fallbackSelectFields)
                .top(500)();

            console.warn('TaskService.getTasks: operating in fallback mode — AssignedTo display names unavailable.');
            const mappedItems = items.map(mapItem);
            return type ? mappedItems.filter((item) => item.type === type) : mappedItems;
        } catch (fallbackError) {
            console.warn(
                'TaskService.getTasks: fallback query also failed, fetching all fields.',
                fallbackError
            );
        }

        // Last resort — broad unfiltered fetch. Catches environments with
        // very strict column-level permissions.
        const broadItems = await sp.web.lists
            .getByTitle(listTitle)
            .items.top(500)();

        const mappedItems = broadItems.map(mapItem);
        return type ? mappedItems.filter((item) => item.type === type) : mappedItems;
    }

    public async createTask(task: any): Promise<any> {
        const sp = getSP();
        const listTitle = await this.getTaskListTitle();
        const availableFields = await this.getListFieldNames();
        const incidentTypeFieldName = await this.getIncidentTypeFieldName();
        const incidentContext = task.requestType === 'Incident'
            ? await this.resolveIncidentContext(task.incidentTypeId)
            : null;

        const payload: Record<string, unknown> = {
            Title: task.title,
            Status: task.status,
            Priority: incidentContext?.priority ?? task.priority,
            Site: task.site,
            StartDate: this.validateDate(task.startDate),
            DueDate: this.validateDate(task.dueDate),
            Description: task.description,
            RequestType: task.requestType,
            Department: incidentContext?.incidentType.department || task.department,
        };

        this.applyFieldIfAvailable(payload, availableFields, 'Type', task.requestType);
        this.applyFieldIfAvailable(payload, availableFields, 'Severity', incidentContext?.incidentType.severity ?? task.severity ?? null);
        this.applyFieldIfAvailable(payload, availableFields, 'Impact', task.impact ?? null);
        this.applyFieldIfAvailable(payload, availableFields, 'AffectedService', task.affectedService ?? null);
        this.applyLookupFieldIfAvailable(payload, incidentTypeFieldName, incidentContext?.incidentType.id ?? task.incidentTypeId ?? null);
        this.applyFieldIfAvailable(payload, availableFields, 'SLAResponseMinutes', incidentContext?.sla.responseMinutes ?? task.slaResponseMinutes ?? null);
        this.applyFieldIfAvailable(payload, availableFields, 'SLAResolutionMinutes', incidentContext?.sla.resolutionMinutes ?? task.slaResolutionMinutes ?? null);
        this.applyFieldIfAvailable(payload, availableFields, 'ResponseDueDate', this.validateDateTime(incidentContext?.sla.responseDueDate ?? task.responseDueDate));
        this.applyFieldIfAvailable(payload, availableFields, 'ResolutionDueDate', this.validateDateTime(incidentContext?.sla.resolutionDueDate ?? task.resolutionDueDate));
        this.applyFieldIfAvailable(payload, availableFields, 'SLADeadline', this.validateDateTime(incidentContext?.sla.deadline ?? task.slaDeadline));
        this.applyFieldIfAvailable(payload, availableFields, 'SLAStatus', incidentContext?.sla.status ?? task.slaStatus ?? null);

        const assigneeField = await this.getAssigneeFieldConfig();
        this.applyAssigneeToPayload(payload, task.assignedToId, assigneeField);

        const result = await sp.web.lists
            .getByTitle(listTitle)
            .items.add(payload);

        // PnP v2 returns { data: { Id }, item }
        // PnP v3 returns { data: { Id, ID, id } } depending on SP version
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

        if (createdId && task.requestType === 'Incident' && incidentContext) {
            try {
                const currentUserId = await this.getCurrentUserId();
                await this.logIncidentCreation(createdId, task, incidentContext, currentUserId);
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
        const incidentContext = updates.requestType === 'Incident' && updates.incidentTypeId
            ? await this.resolveIncidentContext(updates.incidentTypeId)
            : null;

        const payload: Record<string, unknown> = {
            Title: updates.title,
            Status: updates.status,
            Priority: incidentContext?.priority ?? updates.priority,
            Site: updates.site,
            StartDate: this.validateDate(updates.startDate),
            DueDate: this.validateDate(updates.dueDate),
            Description: updates.description,
            RequestType: updates.requestType,
            Department: incidentContext?.incidentType.department || updates.department,
        };

        if (updates.requestType !== undefined) {
            this.applyFieldIfAvailable(payload, availableFields, 'Type', updates.requestType);
        }

        this.applyFieldIfAvailable(
            payload,
            availableFields,
            'Severity',
            updates.requestType === 'Task'
                ? null
                : incidentContext?.incidentType.severity ?? updates.severity ?? null
        );
        this.applyFieldIfAvailable(payload, availableFields, 'Impact', updates.impact ?? null);
        this.applyFieldIfAvailable(payload, availableFields, 'AffectedService', updates.affectedService ?? null);

        if (updates.incidentTypeId !== undefined || updates.requestType === 'Task') {
            this.applyLookupFieldIfAvailable(
                payload,
                incidentTypeFieldName,
                updates.requestType === 'Task'
                    ? null
                    : incidentContext?.incidentType.id ?? updates.incidentTypeId ?? null
            );
        }

        const slaFieldMap: Array<[keyof ITask, string]> = [
            ['slaResponseMinutes', 'SLAResponseMinutes'],
            ['slaResolutionMinutes', 'SLAResolutionMinutes'],
            ['responseDueDate', 'ResponseDueDate'],
            ['resolutionDueDate', 'ResolutionDueDate'],
            ['slaDeadline', 'SLADeadline'],
            ['slaStatus', 'SLAStatus'],
        ];

        for (const [taskKey, spFieldName] of slaFieldMap) {
            if (updates[taskKey] !== undefined || updates.requestType === 'Task') {
                const isDateTimeField = ['ResponseDueDate', 'ResolutionDueDate', 'SLADeadline'].includes(spFieldName);
                const rawValue = updates.requestType === 'Task'
                    ? null
                    : isDateTimeField
                        ? this.validateDateTime(updates[taskKey] as string | undefined)
                        : updates[taskKey] ?? null;

                this.applyFieldIfAvailable(payload, availableFields, spFieldName, rawValue as string | number | null);
            }
        }

        const assigneeField = await this.getAssigneeFieldConfig();
        if (updates.assignedToId !== undefined) {
            this.applyAssigneeToPayload(payload, updates.assignedToId, assigneeField);
        }

        await sp.web.lists.getByTitle(listTitle).items.getById(id).update(payload);
    }

    public async escalateIncidentIfNeeded(
        task: Pick<ITask, 'id' | 'status' | 'requestType' | 'responseDueDate' | 'resolutionDueDate'>
    ): Promise<boolean> {
        if (this.normalizeRequestType(task.requestType) !== 'Incident') return false;
        if (!task.id || task.status === 'Resolved' || task.status === 'Escalated') return false;

        const now = new Date();
        const responseDueDate = this.parseDate(task.responseDueDate);
        const resolutionDueDate = this.parseDate(task.resolutionDueDate);

        let reason: string | null = null;

        if (resolutionDueDate && now > resolutionDueDate) {
            reason = 'Resolution SLA Breached';
        } else if (responseDueDate && now > responseDueDate && task.status === 'New') {
            reason = 'Response SLA Breached';
        }

        if (!reason) return false;

        const sp = getSP();
        const listTitle = await this.getTaskListTitle();
        const availableFields = await this.getListFieldNames();

        const payload: Record<string, unknown> = { Status: 'Escalated' };
        this.applyFieldIfAvailable(payload, availableFields, 'SLAStatus', 'Breached');

        // task.id is typed as ITask['id'] (number) but the value coming from
        // TaskBoard has been .toString()'d. Coerce it here to guarantee SP
        // gets the numeric ID it requires.
        await sp.web.lists
            .getByTitle(listTitle)
            .items.getById(Number(task.id))
            .update(payload);

        const currentUserId = await this.getCurrentUserId();
        await this.addIncidentLog(Number(task.id), 'Escalation', 'SLA', null, reason, currentUserId);

        return true;
    }

    public async deleteTask(id: number): Promise<void> {
        const sp = getSP();
        const listTitle = await this.getTaskListTitle();
        await sp.web.lists.getByTitle(listTitle).items.getById(id).delete();
    }

    // ---------------------------------------------------------------------------
    // Private helpers — date validation
    // ---------------------------------------------------------------------------

    private validateDate(date?: string): string | null {
        if (!date) return null;

        const dateOnlyMatch = date.match(/^\d{4}-\d{2}-\d{2}/);
        if (dateOnlyMatch) return dateOnlyMatch[0];

        const parsed = new Date(date);
        return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
    }

    private validateDateTime(value?: string): string | null {
        if (!value) return null;
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }

    private parseDate(value?: string): Date | null {
        if (!value) return null;
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    // ---------------------------------------------------------------------------
    // Private helpers — list and field discovery (all promise-cached)
    // ---------------------------------------------------------------------------

    private async getTaskListTitle(): Promise<string> {
        if (!this.listTitlePromise) {
            this.listTitlePromise = this.resolveTaskListTitle();
        }
        return this.listTitlePromise;
    }

    private async resolveTaskListTitle(): Promise<string> {
        const sp = getSP();

        for (const candidate of TASK_LIST_TITLE_CANDIDATES) {
            try {
                await sp.web.lists.getByTitle(candidate).select('Id')();
                console.info(`TaskService: resolved list title to "${candidate}"`);
                return candidate;
            } catch {
                // Try the next candidate.
            }
        }

        console.warn(`TaskService: no list found matching candidates. Defaulting to "${TASK_LIST_TITLE_CANDIDATES[0]}"`);
        return TASK_LIST_TITLE_CANDIDATES[0];
    }

    private async getListFieldNames(): Promise<Set<string>> {
        if (!this.listFieldNamesPromise) {
            this.listFieldNamesPromise = this.loadListFieldNames();
        }
        return this.listFieldNamesPromise;
    }

    private async loadListFieldNames(): Promise<Set<string>> {
        const sp = getSP();
        const listTitle = await this.getTaskListTitle();
        const fields = await sp.web.lists
            .getByTitle(listTitle)
            .fields.select('InternalName')();

        return new Set(fields.map((field: any) => field.InternalName as string));
    }

    private async getIncidentTypeFieldName(): Promise<string | null> {
        if (!this.incidentTypeFieldNamePromise) {
            this.incidentTypeFieldNamePromise = this.loadIncidentTypeFieldName();
        }
        return this.incidentTypeFieldNamePromise;
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
            console.warn('TaskService: could not find an assignee field. Defaulting to "AssignedTo" (single-value).');
            return { internalName: 'AssignedTo', isMulti: false };
        }

        return {
            internalName: field.InternalName,
            isMulti: (field as any).AllowMultipleValues === true || field.TypeAsString === 'UserMulti',
        };
    }

    // ---------------------------------------------------------------------------
    // Private helpers — payload construction
    // ---------------------------------------------------------------------------

    private applyAssigneeToPayload(
        payload: Record<string, unknown>,
        assignedToId: number | null | undefined,
        fieldConfig: IAssigneeFieldConfig
    ): void {
        const fieldName = `${fieldConfig.internalName}Id`;

        if (assignedToId == null) {
            payload[fieldName] = null;
            return;
        }

        payload[fieldName] = fieldConfig.isMulti
            ? { results: [assignedToId] }
            : assignedToId;
    }

    private applyFieldIfAvailable(
        payload: Record<string, unknown>,
        availableFields: Set<string>,
        fieldName: string,
        value: string | number | null | undefined
    ): void {
        if (!availableFields.has(fieldName)) return;
        payload[fieldName] = value ?? null;
    }

    private applyLookupFieldIfAvailable(
        payload: Record<string, unknown>,
        fieldName: string | null,
        lookupId: number | null
    ): void {
        if (!fieldName) return;
        payload[`${fieldName}Id`] = lookupId;
    }

    // ---------------------------------------------------------------------------
    // Private helpers — SP user/lookup value extraction
    // ---------------------------------------------------------------------------

    private getPrimaryAssignee(
        value: ISPUserValue | ISPUserValue[] | undefined
    ): ISPUserValue | undefined {
        if (!value) return undefined;
        return Array.isArray(value) ? value[0] : value;
    }

    private getPrimaryAssigneeId(
        value: number | number[] | { results?: number[] } | undefined
    ): number | undefined {
        if (typeof value === 'number') return value;
        if (Array.isArray(value)) return value[0];
        return value?.results?.[0];
    }

    private getPrimaryLookupId(
        value: number | number[] | { results?: number[] } | undefined
    ): number | undefined {
        if (typeof value === 'number') return value;
        if (Array.isArray(value)) return value[0];
        return value?.results?.[0];
    }

    // ---------------------------------------------------------------------------
    // Private helpers — field name normalization and search
    // ---------------------------------------------------------------------------

    private normalizeFieldName(value?: string): string {
        return (value ?? '')
            .replace(/_x0020_/gi, '')
            .replace(/\s+/g, '')
            .toLowerCase();
    }

    private findFieldByCandidates(fields: any[], candidates: string[]): any | undefined {
        return fields.find((candidate: any) => {
            if (!candidate?.InternalName) return false;

            const normalizedInternalName = this.normalizeFieldName(candidate.InternalName);
            const normalizedTitle = this.normalizeFieldName(candidate.Title);

            return candidates.some((name) => {
                const normalizedCandidate = this.normalizeFieldName(name);
                return (
                    normalizedInternalName === normalizedCandidate ||
                    normalizedTitle === normalizedCandidate
                );
            });
        });
    }

    // ---------------------------------------------------------------------------
    // Private helpers — type coercion
    // ---------------------------------------------------------------------------

    private normalizeRequestType(value?: string): TaskRequestType {
        return (value ?? '').toLowerCase() === 'incident' ? 'Incident' : 'Task';
    }

    private toWorkItemType(requestType: TaskRequestType): WorkItemType {
        return requestType === 'Incident' ? 'incident' : 'task';
    }

    // ---------------------------------------------------------------------------
    // Private helpers — incident context resolution
    // ---------------------------------------------------------------------------

    private async resolveIncidentContext(incidentTypeId?: number | null): Promise<{
        incidentType: IIncidentType;
        priority: ReturnType<typeof getPriorityFromSeverity>;
        sla: ReturnType<typeof buildIncidentSla>;
    }> {
        if (!incidentTypeId) {
            throw new Error('Incident Type is required before an incident can be saved.');
        }

        const incidentType = await this.getIncidentTypeById(incidentTypeId);
        if (!incidentType?.severity) {
            throw new Error(`Incident Type ${incidentTypeId} is missing a valid severity.`);
        }

        return {
            incidentType,
            priority: getPriorityFromSeverity(incidentType.severity),
            sla: buildIncidentSla(incidentType.severity),
        };
    }

    private async getIncidentTypeById(incidentTypeId: number): Promise<IIncidentType | null> {
        const sp = getSP();

        const item = await sp.web.lists
            .getByTitle(INCIDENT_TYPE_LIST_TITLE)
            .items.getById(incidentTypeId)
            .select('Id', 'Title', 'Severity', 'Department', 'IsActive')();

        if (!item?.Id || !item?.Title || !item?.Severity) {
            return null;
        }

        return {
            id: item.Id,
            title: item.Title,
            severity: item.Severity,
            department: item.Department,
            isActive: item.IsActive === true || item.IsActive === 1,
        };
    }

    // ---------------------------------------------------------------------------
    // Private helpers — incident audit logging
    // ---------------------------------------------------------------------------

    private async getCurrentUserId(): Promise<number | null> {
        const sp = getSP();

        try {
            const user = await sp.web.currentUser();
            return typeof (user as any)?.Id === 'number' ? (user as any).Id : null;
        } catch (error) {
            console.warn('TaskService: could not resolve current SP user ID for audit logging.', error);
            return null;
        }
    }

    private async logIncidentCreation(
        workItemId: number,
        task: any,
        incidentContext: {
            incidentType: IIncidentType;
            priority: ReturnType<typeof getPriorityFromSeverity>;
            sla: ReturnType<typeof buildIncidentSla>;
        },
        currentUserId: number | null
    ): Promise<void> {
        // Sequential writes to avoid SP throttling on rapid consecutive POSTs.
        await this.addIncidentLog(workItemId, 'Created', 'Incident', null, task.title ?? null, currentUserId);
        await this.addIncidentLog(workItemId, 'FieldChange', 'IncidentType', null, incidentContext.incidentType.title, currentUserId);
        await this.addIncidentLog(workItemId, 'FieldChange', 'Severity', null, incidentContext.incidentType.severity, currentUserId);
        await this.addIncidentLog(workItemId, 'FieldChange', 'Priority', null, incidentContext.priority, currentUserId);
        await this.addIncidentLog(workItemId, 'SLA', 'ResponseDue', null, incidentContext.sla.responseDueDate, currentUserId);
        await this.addIncidentLog(workItemId, 'SLA', 'ResolutionDue', null, incidentContext.sla.resolutionDueDate, currentUserId);
    }

    // Fetches the IncidentLogs field schema once and caches it for the lifetime
    // of this service instance. Every audit entry on the same page load reuses
    // the cached schema instead of hitting /_api/fields again.
    private getIncidentLogFieldSchema(): Promise<any[]> {
        if (!this.incidentLogFieldSchemaPromise) {
            const sp = getSP();
            this.incidentLogFieldSchemaPromise = sp.web.lists
                .getByTitle(INCIDENT_LOG_LIST_TITLE)
                .fields.select('InternalName', 'Title', 'TypeAsString')();
        }
        return this.incidentLogFieldSchemaPromise;
    }

    private async addIncidentLog(
        workItemId: number,
        action: string,
        fieldName: string,
        oldValue: string | number | null,
        newValue: string | number | null,
        performedById: number | null
    ): Promise<void> {
        const sp = getSP();

        // Reuse the cached schema — no extra network call after the first entry.
        const fields = await this.getIncidentLogFieldSchema();

        const workItemField = this.findFieldByCandidates(fields, INCIDENT_LOG_WORKITEM_FIELD_CANDIDATES);
        const actionField = this.findFieldByCandidates(fields, INCIDENT_LOG_ACTION_FIELD_CANDIDATES);
        const fieldNameField = this.findFieldByCandidates(fields, INCIDENT_LOG_FIELDNAME_FIELD_CANDIDATES);
        const oldValueField = this.findFieldByCandidates(fields, INCIDENT_LOG_OLDVALUE_FIELD_CANDIDATES);
        const newValueField = this.findFieldByCandidates(fields, INCIDENT_LOG_NEWVALUE_FIELD_CANDIDATES);
        const timestampField = this.findFieldByCandidates(fields, INCIDENT_LOG_TIMESTAMP_FIELD_CANDIDATES);
        const performedByField = this.findFieldByCandidates(fields, INCIDENT_LOG_PERFORMEDBY_FIELD_CANDIDATES);

        const payload: Record<string, unknown> = {
            Title: `${fieldName} ${action}`,
        };

        if (workItemField) {
            const isLookup = workItemField.TypeAsString === 'Lookup' || workItemField.TypeAsString === 'LookupMulti';
            payload[isLookup ? `${workItemField.InternalName}Id` : workItemField.InternalName] = workItemId;
        }

        if (actionField) {
            payload[actionField.InternalName] = action;
        }

        if (fieldNameField) {
            payload[fieldNameField.InternalName] = fieldName;
        }

        if (oldValueField) {
            payload[oldValueField.InternalName] = oldValue == null ? null : String(oldValue);
        }

        if (newValueField) {
            payload[newValueField.InternalName] = newValue == null ? null : String(newValue);
        }

        if (timestampField) {
            payload[timestampField.InternalName] = new Date().toISOString();
        }

        if (performedByField && performedById) {
            const isUserField = performedByField.TypeAsString === 'User' || performedByField.TypeAsString === 'UserMulti';
            if (isUserField) {
                payload[`${performedByField.InternalName}Id`] = performedByField.TypeAsString === 'UserMulti'
                    ? { results: [performedById] }
                    : performedById;
            } else {
                payload[performedByField.InternalName] = performedById;
            }
        }

        await sp.web.lists
            .getByTitle(INCIDENT_LOG_LIST_TITLE)
            .items.add(payload);
    }

    private async getDepartmentLead(department: string): Promise<{ id: number; name: string; email: string } | null> {
        const sp = getSP();
        const normalizedDepartment = (department ?? '').trim().toLowerCase();
        if (!normalizedDepartment) return null;
        const sanitizedDepartment = normalizedDepartment.replace(/'/g, "''");

        const roles = await sp.web.lists
            .getByTitle(USER_ROLE_LIST_TITLE)
            .items
            .select('User/Id', 'User/Title', 'User/EMail', 'Department', 'IsDepartmentLead', 'IsActive')
            .expand('User')
            .filter(`tolower(Department) eq '${sanitizedDepartment}' and IsDepartmentLead eq 1 and IsActive eq 1`)
            .top(1)();

        const role = roles[0];
        if (!role?.User?.Id) return null;

        return {
            id: role.User.Id,
            name: role.User.Title ?? '',
            email: role.User.EMail ?? '',
        };
    }

    private async logSlaEscalation(
        workItemId: number,
        oldAssignedTo: string,
        newAssignedTo: string
    ): Promise<void> {
        const sp = getSP();
        const fields = await this.getIncidentLogFieldSchema();

        const workItemField = this.findFieldByCandidates(fields, INCIDENT_LOG_WORKITEM_FIELD_CANDIDATES);
        const actionField = this.findFieldByCandidates(fields, INCIDENT_LOG_ACTION_FIELD_CANDIDATES);
        const oldValueField = this.findFieldByCandidates(fields, INCIDENT_LOG_OLDVALUE_FIELD_CANDIDATES);
        const newValueField = this.findFieldByCandidates(fields, INCIDENT_LOG_NEWVALUE_FIELD_CANDIDATES);
        const timestampField = this.findFieldByCandidates(fields, INCIDENT_LOG_TIMESTAMP_FIELD_CANDIDATES);

        const payload: Record<string, unknown> = {
            Title: 'SLA Breached',
        };

        if (workItemField) {
            const isLookup = workItemField.TypeAsString === 'Lookup' || workItemField.TypeAsString === 'LookupMulti';
            payload[isLookup ? `${workItemField.InternalName}Id` : workItemField.InternalName] = workItemId;
        }

        if (actionField) {
            payload[actionField.InternalName] = 'Escalated';
        }

        if (oldValueField) {
            payload[oldValueField.InternalName] = oldAssignedTo;
        }

        if (newValueField) {
            payload[newValueField.InternalName] = newAssignedTo;
        }

        if (timestampField) {
            payload[timestampField.InternalName] = new Date().toISOString();
        }

        await sp.web.lists
            .getByTitle(INCIDENT_LOG_LIST_TITLE)
            .items.add(payload);
    }
}