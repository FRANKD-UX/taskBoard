import '@pnp/sp/fields';

import { getSP } from '../pnpjsConfig';
import type {
    IIncidentType,
    ITask,
    TaskRequestType,
    WorkItemType,
} from '../webparts/taskBoard/components/TaskTypes';
import { CollaboratorService } from './CollaboratorService';
import { NotificationService } from './NotificationService';
import { getUserRole } from './UserRoleService';
import { IncidentPolicy, type IIncidentUserContext } from './incidents/IncidentPolicy';
import {
    ensureValidDepartment,
    ensureValidSeverity,
    normalizeDepartment,
} from './incidents/IncidentDepartmentRules';
import { isIncidentTitleAllowedForDepartment } from './incidents/IncidentCatalog';

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
    LoginName?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TASK_LIST_TITLE_CANDIDATES = ['WorkItems', 'Tasks', 'Task Management System'];
const ASSIGNEE_FIELD_CANDIDATES = ['AssignedTo', 'Assigned To', 'AssignedUser', 'Assigned User'];

const INCIDENT_TYPE_LIST_TITLE = 'IncidentTypes';
const INCIDENT_LOG_LIST_TITLE = 'IncidentLogs';
const USER_ROLE_LIST_TITLE = 'UserRoles';

const INCIDENT_TYPE_FIELD_CANDIDATES = ['IncidentType', 'Incident Type'];

const INCIDENT_LOG_WORKITEM_FIELD_CANDIDATES = ['WorkItemId', 'Work Item', 'WorkItem'];
const INCIDENT_LOG_ACTION_FIELD_CANDIDATES = ['Action'];
const INCIDENT_LOG_FIELDNAME_FIELD_CANDIDATES = ['FieldName', 'Field Name'];
const INCIDENT_LOG_OLDVALUE_FIELD_CANDIDATES = ['OldValue', 'Old Value'];
const INCIDENT_LOG_NEWVALUE_FIELD_CANDIDATES = ['NewValue', 'New Value'];
const INCIDENT_LOG_TIMESTAMP_FIELD_CANDIDATES = ['Timestamp'];
const INCIDENT_LOG_PERFORMEDBY_FIELD_CANDIDATES = ['PerformedBy', 'Performed By'];

// ---------------------------------------------------------------------------
// TaskService
// ---------------------------------------------------------------------------

export class TaskService {
    private assigneeFieldConfigPromise?: Promise<IAssigneeFieldConfig>;
    private incidentTypeFieldNamePromise?: Promise<string | null>;
    private listTitlePromise?: Promise<string>;
    private listFieldNamesPromise?: Promise<Set<string>>;

    private static readonly AT_RISK_REMAINING_HOURS = 1;

    private notificationService?: NotificationService;

    public setNotificationService(service: NotificationService): void {
        this.notificationService = service;
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    public async getIncidentTypes(): Promise<IIncidentType[]> {
        const sp = getSP();

        try {
            const items = await sp.web.lists
                .getByTitle(INCIDENT_TYPE_LIST_TITLE)
                .items
                .select('Id', 'Title', 'Severity', 'Department', 'IsActive')
                .filter('IsActive eq 1')
                .orderBy('Title', true)();

            return items
                .filter((item: any) => item?.Title && item?.Severity)
                .map((item: any) => ({
                    id: item.Id,
                    title: item.Title,
                    severity: item.Severity,
                    department: normalizeDepartment(item.Department),
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
            const assignee = this.getPrimaryAssignee(
                item[assigneeField.internalName] ?? item.AssignedTo
            );

            const fallbackAssigneeId = this.getPrimaryAssigneeId(
                item[assigneeLookupField] ?? item.AssignedToId
            );

            const rawIncidentType = incidentTypeFieldName
                ? item[incidentTypeFieldName]
                : undefined;

            const incidentType = this.getIncidentTypeValue(rawIncidentType);
            const requestType = this.normalizeRequestType(item.RequestType ?? item.Type);
            const workItemType = this.toWorkItemType(requestType);

            return {
                id: item.Id,
                type: workItemType,

                title: item.Title || '',
                status: item.Status || (workItemType === 'incident' ? 'New' : 'Unassigned'),
                priority: item.Priority || 'Medium',
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
                department: normalizeDepartment(item.Department),
                createdBy: item.Author?.Title,
                authorId: item.Author?.Id ?? null,

                severity: item.Severity,
                impact: item.Impact,
                affectedService: item.AffectedService,
                incidentTypeId:
                    incidentType?.id ??
                    this.getPrimaryLookupId(
                        item[incidentTypeFieldName ? `${incidentTypeFieldName}Id` : '']
                    ),
                incidentType,

                slaResponseMinutes: item.SLAResponseMinutes,
                slaResolutionMinutes: item.SLAResolutionMinutes,
                responseDueDate: item.ResponseDueDate,
                resolutionDueDate: item.ResolutionDueDate,
                slaDeadline: item.SLADeadline,
                slaStatus: item.SLAStatus,
            };
        };

        const buildSelectAndExpand = (): {
            selectFields: string[];
            expandFields: string[];
        } => {
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
                'ResponseDueDate',
                'ResolutionDueDate',
                'SLADeadline',
                'SLAStatus',
                `${assigneeField.internalName}/Title`,
                `${assigneeField.internalName}/Id`,
                `${assigneeField.internalName}/EMail`,
                assigneeLookupField,
                'Author/Id',
                'Author/Title',
            ];

            const expandFields: string[] = [
                assigneeField.internalName,
                'Author',
            ];

            if (incidentTypeFieldName) {
                selectFields.push(
                    `${incidentTypeFieldName}/Id`,
                    `${incidentTypeFieldName}/Title`,
                    `${incidentTypeFieldName}/Department`,
                    `${incidentTypeFieldName}/Severity`,
                    `${incidentTypeFieldName}Id`
                );

                expandFields.push(incidentTypeFieldName);
            }

            return { selectFields, expandFields };
        };

        try {
            const { selectFields, expandFields } = buildSelectAndExpand();

            const items = await sp.web.lists
                .getByTitle(listTitle)
                .items
                .select(...selectFields)
                .expand(...expandFields)
                .top(500)();

            const mappedItems = items.map(mapItem);

            return type
                ? mappedItems.filter((item) => item.type === type)
                : mappedItems;
        } catch (primaryError) {
            console.warn(
                'TaskService.getTasks: full typed query failed, trying minimal expanded query.',
                primaryError
            );
        }

        try {
            const { selectFields, expandFields } = buildSelectAndExpand();

            const minimalSelect = selectFields.filter(
                (field) =>
                    field !== `${assigneeField.internalName}/EMail` &&
                    field !== `${incidentTypeFieldName}/Severity`
            );

            const minimalItems = await sp.web.lists
                .getByTitle(listTitle)
                .items
                .select(...minimalSelect)
                .expand(...expandFields)
                .top(500)();

            const mappedItems = minimalItems.map(mapItem);

            return type
                ? mappedItems.filter((item) => item.type === type)
                : mappedItems;
        } catch (minimalError) {
            console.warn(
                'TaskService.getTasks: minimal expanded query failed, falling back to broad item fetch.',
                minimalError
            );
        }

        const fallbackItems = await sp.web.lists
            .getByTitle(listTitle)
            .items
            .top(500)();

        const mappedItems = fallbackItems.map(mapItem);

        return type
            ? mappedItems.filter((item) => item.type === type)
            : mappedItems;
    }

    public async createTask(task: any): Promise<any> {
        const normalizedDepartment = ensureValidDepartment(task.department);

        await this.validateIncidentBeforePersist('create', {
            ...task,
            department: normalizedDepartment,
        });

        const sp = getSP();
        const listTitle = await this.getTaskListTitle();
        const availableFields = await this.getListFieldNames();
        const incidentTypeFieldName = await this.getIncidentTypeFieldName();

        const payload: Record<string, any> = {
            Title: task.title,
            Status: task.status,
            Priority: task.priority,
            Site: task.site,
            StartDate: this.validateDate(task.startDate),
            DueDate: this.validateDate(task.dueDate),
            Description: task.description,
            RequestType: task.requestType,
            Department: normalizedDepartment,
        };

        this.applyFieldIfAvailable(payload, availableFields, 'Type', task.requestType);
        this.applyFieldIfAvailable(payload, availableFields, 'Severity', task.severity ?? null);
        this.applyFieldIfAvailable(payload, availableFields, 'Impact', task.impact ?? null);
        this.applyFieldIfAvailable(payload, availableFields, 'AffectedService', task.affectedService ?? null);

        this.applyLookupFieldIfAvailable(
            payload,
            incidentTypeFieldName,
            task.incidentTypeId ?? null
        );

        this.applyFieldIfAvailable(
            payload,
            availableFields,
            'SLAResponseMinutes',
            task.slaResponseMinutes ?? null
        );

        this.applyFieldIfAvailable(
            payload,
            availableFields,
            'SLAResolutionMinutes',
            task.slaResolutionMinutes ?? null
        );

        this.applyFieldIfAvailable(
            payload,
            availableFields,
            'ResponseDueDate',
            this.validateDateTime(task.responseDueDate)
        );

        this.applyFieldIfAvailable(
            payload,
            availableFields,
            'ResolutionDueDate',
            this.validateDateTime(task.resolutionDueDate)
        );

        this.applyFieldIfAvailable(
            payload,
            availableFields,
            'SLADeadline',
            this.validateDateTime(task.slaDeadline)
        );

        this.applyFieldIfAvailable(
            payload,
            availableFields,
            'SLAStatus',
            task.slaStatus ?? null
        );

        const assigneeField = await this.getAssigneeFieldConfig();

        this.applyAssigneeToPayload(payload, task.assignedToId, assigneeField);

        const result = await sp.web.lists
            .getByTitle(listTitle)
            .items
            .add(this.removeUndefinedFields(payload));

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
        const existingItem = await this.getTaskSnapshot(id);

        await this.validateIncidentBeforePersist(
            'update',
            updates,
            existingItem ?? undefined
        );

        const sp = getSP();
        const listTitle = await this.getTaskListTitle();
        const availableFields = await this.getListFieldNames();
        const incidentTypeFieldName = await this.getIncidentTypeFieldName();

        const normalizedDepartment =
            updates.department !== undefined
                ? ensureValidDepartment(updates.department)
                : undefined;

        const payload: Record<string, any> = {
            Title: updates.title,
            Status: updates.status,
            Priority: updates.priority,
            Site: updates.site,
            StartDate:
                updates.startDate !== undefined
                    ? this.validateDate(updates.startDate)
                    : undefined,
            DueDate:
                updates.dueDate !== undefined
                    ? this.validateDate(updates.dueDate)
                    : undefined,
            Description: updates.description,
            RequestType: updates.requestType,
            Department: normalizedDepartment,
        };

        if (updates.requestType !== undefined) {
            this.applyFieldIfAvailable(payload, availableFields, 'Type', updates.requestType);
        }

        if (updates.severity !== undefined || updates.requestType === 'Task') {
            this.applyFieldIfAvailable(
                payload,
                availableFields,
                'Severity',
                updates.requestType === 'Task' ? null : updates.severity ?? null
            );
        }

        if (updates.impact !== undefined || updates.requestType === 'Task') {
            this.applyFieldIfAvailable(
                payload,
                availableFields,
                'Impact',
                updates.requestType === 'Task' ? null : updates.impact ?? null
            );
        }

        if (updates.affectedService !== undefined || updates.requestType === 'Task') {
            this.applyFieldIfAvailable(
                payload,
                availableFields,
                'AffectedService',
                updates.requestType === 'Task'
                    ? null
                    : updates.affectedService ?? null
            );
        }

        if (updates.incidentTypeId !== undefined || updates.requestType === 'Task') {
            this.applyLookupFieldIfAvailable(
                payload,
                incidentTypeFieldName,
                updates.requestType === 'Task'
                    ? null
                    : updates.incidentTypeId ?? null
            );
        }

        if (updates.slaResponseMinutes !== undefined || updates.requestType === 'Task') {
            this.applyFieldIfAvailable(
                payload,
                availableFields,
                'SLAResponseMinutes',
                updates.requestType === 'Task'
                    ? null
                    : updates.slaResponseMinutes ?? null
            );
        }

        if (updates.slaResolutionMinutes !== undefined || updates.requestType === 'Task') {
            this.applyFieldIfAvailable(
                payload,
                availableFields,
                'SLAResolutionMinutes',
                updates.requestType === 'Task'
                    ? null
                    : updates.slaResolutionMinutes ?? null
            );
        }

        if (updates.responseDueDate !== undefined || updates.requestType === 'Task') {
            this.applyFieldIfAvailable(
                payload,
                availableFields,
                'ResponseDueDate',
                updates.requestType === 'Task'
                    ? null
                    : this.validateDateTime(updates.responseDueDate)
            );
        }

        if (updates.resolutionDueDate !== undefined || updates.requestType === 'Task') {
            this.applyFieldIfAvailable(
                payload,
                availableFields,
                'ResolutionDueDate',
                updates.requestType === 'Task'
                    ? null
                    : this.validateDateTime(updates.resolutionDueDate)
            );
        }

        if (updates.slaDeadline !== undefined || updates.requestType === 'Task') {
            this.applyFieldIfAvailable(
                payload,
                availableFields,
                'SLADeadline',
                updates.requestType === 'Task'
                    ? null
                    : this.validateDateTime(updates.slaDeadline)
            );
        }

        if (updates.slaStatus !== undefined || updates.requestType === 'Task') {
            this.applyFieldIfAvailable(
                payload,
                availableFields,
                'SLAStatus',
                updates.requestType === 'Task'
                    ? null
                    : updates.slaStatus ?? null
            );
        }

        const assigneeField = await this.getAssigneeFieldConfig();

        if (updates.assignedToId !== undefined) {
            this.applyAssigneeToPayload(payload, updates.assignedToId, assigneeField);
        }

        await sp.web.lists
            .getByTitle(listTitle)
            .items
            .getById(id)
            .update(this.removeUndefinedFields(payload));
    }

    public async deleteTask(id: number): Promise<void> {
        const sp = getSP();
        const listTitle = await this.getTaskListTitle();

        await sp.web.lists
            .getByTitle(listTitle)
            .items
            .getById(id)
            .delete();
    }

    // -----------------------------------------------------------------------
    // SLA Escalation & Notification
    // -----------------------------------------------------------------------

    public async checkAndEscalateSLAs(): Promise<void> {
        const sp = getSP();
        const listTitle = await this.getTaskListTitle();
        const assigneeField = await this.getAssigneeFieldConfig();

        console.log('SLA CHECK START');

        const items = await sp.web.lists
            .getByTitle(listTitle)
            .items
            .select(
                'Id',
                'Title',
                'Department',
                `${assigneeField.internalName}/Id`,
                `${assigneeField.internalName}/Title`,
                `${assigneeField.internalName}/EMail`,
                'SLADeadline',
                'SLAStatus',
                'RequestType',
                'Type',
                'ResponseDueDate',
                'ResolutionDueDate'
            )
            .expand(assigneeField.internalName)
            .filter("ResolutionDueDate ne null and (Status ne 'Resolved' and Status ne 'Escalated')")
            .top(500)();

        for (const item of items) {
            try {
                const requestType = this.normalizeRequestType(item.RequestType ?? item.Type);

                if (requestType !== 'Incident') continue;

                const newStatus = this.computeSlaStatus(
                    item.ResponseDueDate,
                    item.ResolutionDueDate
                );

                const oldStatus = item.SLAStatus;

                if (newStatus && newStatus !== oldStatus) {
                    await sp.web.lists
                        .getByTitle(listTitle)
                        .items
                        .getById(item.Id)
                        .update({ SLAStatus: newStatus });

                    console.log(`SLA status updated for item ${item.Id}: ${oldStatus} → ${newStatus}`);
                }

                if (newStatus !== 'Breached') continue;

                const department = item.Department ?? '';

                if (!department) {
                    console.warn(`No department for item ${item.Id}`);
                    continue;
                }

                const teamLead = await this.getDepartmentRole(department, 'TeamLead');
                const manager = await this.getDepartmentRole(department, 'Manager');

                let newAssignee = teamLead;
                let escalateToRole = 'TeamLead';

                if (!newAssignee) {
                    newAssignee = manager;
                    escalateToRole = 'Manager';
                }

                if (!newAssignee) {
                    console.warn(`Neither team lead nor manager found for department: ${department}`);
                    continue;
                }

                const assigneeObj = item[assigneeField.internalName];
                const currentAssigneeId = this.getPrimaryAssigneeId(assigneeObj?.Id);

                if (currentAssigneeId === newAssignee.id) continue;

                const previousName = assigneeObj?.Title ?? '';

                const updatePayload: Record<string, any> = {
                    SLAStatus: 'Breached',
                    Status: 'Escalated',
                };

                this.applyAssigneeToPayload(updatePayload, newAssignee.id, assigneeField);

                await sp.web.lists
                    .getByTitle(listTitle)
                    .items
                    .getById(item.Id)
                    .update(updatePayload);

                console.log(`ESCALATED to ${escalateToRole}: ${newAssignee.name}`);

                if (escalateToRole === 'TeamLead' && manager && manager.id !== newAssignee.id) {
                    try {
                        const collaboratorSvc = new CollaboratorService();

                        await collaboratorSvc.addCollaboratorToTask(
                            listTitle,
                            item.Id,
                            manager.id
                        );

                        console.log(`Manager added as collaborator: ${manager.name}`);
                    } catch (collabErr) {
                        console.warn('Could not add manager as collaborator', collabErr);
                    }
                }

                await this.logSlaEscalation(item.Id, previousName, newAssignee.name);

                if (escalateToRole === 'TeamLead' && manager && manager.id !== newAssignee.id) {
                    try {
                        const currentUserId = await this.getCurrentUserId();

                        await this.addIncidentLog(
                            item.Id,
                            'Escalation',
                            'CollaboratorAdded',
                            null,
                            `${manager.name} (Manager)`,
                            currentUserId
                        );
                    } catch (logErr) {
                        console.warn('Could not log manager addition', logErr);
                    }
                }

                if (this.notificationService) {
                    try {
                        await this.notificationService.sendEscalationNotification({
                            escalatedToEmail: newAssignee.email,
                            escalatedToName: newAssignee.name,
                            managerEmail: manager?.email,
                            incidentTitle: item.Title ?? '',
                            incidentId: String(item.Id),
                            department,
                            oldAssignee: previousName,
                        });

                        console.log('Notification sent for item', item.Id);
                    } catch (notifyErr) {
                        console.warn('Failed to send escalation notification', notifyErr);
                    }
                }
            } catch (error) {
                console.error(
                    'TaskService.checkAndEscalateSLAs: escalation failed for item',
                    item.Id,
                    error
                );
            }
        }
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private async getTaskSnapshot(id: number): Promise<ITask | null> {
        const tasks = await this.getTasks();

        return tasks.find((item) => item.id === id) ?? null;
    }

    private async getCurrentIncidentUserContext(): Promise<IIncidentUserContext> {
        const sp = getSP();
        const currentUser = await sp.web.currentUser();
        const userId = (currentUser as any).Id ?? null;
        const userEmail = (currentUser as any).Email ?? '';

        let role = null;

        if (userEmail) {
            try {
                role = await getUserRole(userEmail);
            } catch (error) {
                console.warn(
                    'TaskService: failed to resolve current user role for policy validation.',
                    error
                );
            }
        }

        return {
            id: userId,
            role: role?.role ?? '',
            department: role?.department ?? '',
            canAssign: role?.canAssign === true,
            canAssignAcrossDepartments: role?.canAssignAcrossDepartments === true,
            isDepartmentLead: role?.isDepartmentLead === true,
        };
    }

    private async validateIncidentBeforePersist(
        operation: 'create' | 'update',
        payload: any,
        existing?: Partial<ITask>
    ): Promise<void> {
        const merged = {
            ...(existing ?? {}),
            ...(payload ?? {}),
        };

        const requestType = this.normalizeRequestType(merged.requestType);

        if (requestType !== 'Incident') {
            return;
        }

        const department = ensureValidDepartment(merged.department);
        const severity = ensureValidSeverity(merged.severity);
        const site = merged.site;
        const assignedToId = merged.assignedToId ?? null;
        const incidentTypeId = merged.incidentTypeId ?? null;
        const incidentTypeTitle = merged.incidentType?.title;

        if (!incidentTypeId) {
            throw new Error('Incident Type is required before an incident can be saved.');
        }

        if (
            IncidentPolicy.requiresSite({
                department,
                severity,
                site,
                incidentTypeTitle,
            }) &&
            !site
        ) {
            throw new Error('IT incidents require a site.');
        }

        if (merged.incidentType?.department) {
            const incidentTypeDepartment = ensureValidDepartment(
                merged.incidentType.department
            );

            if (incidentTypeDepartment !== department) {
                throw new Error('Incident type department must match incident department.');
            }
        }

        if (merged.incidentType?.severity && merged.incidentType.severity !== severity) {
            throw new Error('Incident type severity must match incident severity.');
        }

        if (
            incidentTypeTitle &&
            !isIncidentTitleAllowedForDepartment(department, incidentTypeTitle)
        ) {
            throw new Error('Incident type is not compatible with the selected department.');
        }

        const actingUser = await this.getCurrentIncidentUserContext();

        const incident = {
            department,
            severity,
            assignedToId,
            site,
            incidentTypeTitle,
        };

        if (
            operation === 'create' &&
            !IncidentPolicy.canCreateIncident(actingUser, department)
        ) {
            throw new Error('You are not allowed to create incidents for this department.');
        }

        if (
            operation === 'update' &&
            !IncidentPolicy.canEditIncident(actingUser, incident)
        ) {
            throw new Error('You are not allowed to edit this incident.');
        }

        const assignmentChanged =
            operation === 'create' ||
            payload.assignedToId !== undefined;

        if (!assignmentChanged || assignedToId === null) {
            return;
        }

        if (assignedToId === actingUser.id) {
            if (!IncidentPolicy.canClaimIncident(actingUser, incident)) {
                throw new Error('You are not allowed to claim this incident.');
            }

            return;
        }

        const targetDepartment = await this.getUserDepartmentById(assignedToId);

        if (
            !IncidentPolicy.canAssignIncident(
                actingUser,
                incident,
                {
                    id: assignedToId,
                    department: targetDepartment,
                }
            )
        ) {
            throw new Error('You are not allowed to assign this incident.');
        }
    }

    private async getUserDepartmentById(userId: number): Promise<string | undefined> {
        const sp = getSP();

        try {
            const items = await sp.web.lists
                .getByTitle(USER_ROLE_LIST_TITLE)
                .items
                .filter(`User/Id eq ${userId} and IsActive eq 1`)
                .select('Department', 'User/Id')
                .expand('User')
                .top(1)();

            return items[0]?.Department;
        } catch (error) {
            console.warn('TaskService: failed to resolve target user department.', error);
            return undefined;
        }
    }

    private removeUndefinedFields(payload: Record<string, any>): Record<string, any> {
        return Object.keys(payload).reduce<Record<string, any>>((cleaned, key) => {
            if (payload[key] !== undefined) {
                cleaned[key] = payload[key];
            }

            return cleaned;
        }, {});
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
                await sp.web.lists
                    .getByTitle(listTitle)
                    .select('Id')();

                return listTitle;
            } catch {
                // Try next candidate.
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

    private async loadListFieldNames(): Promise<Set<string>> {
        const sp = getSP();
        const listTitle = await this.getTaskListTitle();

        const fields = await sp.web.lists
            .getByTitle(listTitle)
            .fields
            .select('InternalName')();

        return new Set(fields.map((field: any) => field.InternalName));
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
            .fields
            .select('InternalName', 'Title', 'TypeAsString')();

        const field = fields.find((candidate: any) => {
            if (!candidate?.InternalName) return false;

            if (
                candidate.TypeAsString !== 'Lookup' &&
                candidate.TypeAsString !== 'LookupMulti'
            ) {
                return false;
            }

            const normalizedInternalName = this.normalizeFieldName(candidate.InternalName);
            const normalizedTitle = this.normalizeFieldName(candidate.Title);

            return INCIDENT_TYPE_FIELD_CANDIDATES.some((name) => {
                const normalizedCandidate = this.normalizeFieldName(name);

                return (
                    normalizedInternalName === normalizedCandidate ||
                    normalizedTitle === normalizedCandidate
                );
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
            .fields
            .select('InternalName', 'Title', 'TypeAsString', 'AllowMultipleValues')();

        const field = fields.find((candidate: any) => {
            if (!candidate?.InternalName) return false;

            if (
                candidate.TypeAsString !== 'User' &&
                candidate.TypeAsString !== 'UserMulti'
            ) {
                return false;
            }

            const normalizedInternalName = this.normalizeFieldName(candidate.InternalName);
            const normalizedTitle = this.normalizeFieldName(candidate.Title);

            return ASSIGNEE_FIELD_CANDIDATES.some((name) => {
                const normalizedCandidate = this.normalizeFieldName(name);

                return (
                    normalizedInternalName === normalizedCandidate ||
                    normalizedTitle === normalizedCandidate
                );
            });
        });

        if (!field) {
            return {
                internalName: 'AssignedTo',
                isMulti: false,
            };
        }

        return {
            internalName: field.InternalName,
            isMulti:
                (field as any).AllowMultipleValues === true ||
                field.TypeAsString === 'UserMulti',
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
            results: [assignedToId],
        };
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
            .fields
            .select('InternalName', 'Title', 'TypeAsString')();

        const workItemField = this.findFieldByCandidates(fields, INCIDENT_LOG_WORKITEM_FIELD_CANDIDATES);
        const actionField = this.findFieldByCandidates(fields, INCIDENT_LOG_ACTION_FIELD_CANDIDATES);
        const timestampField = this.findFieldByCandidates(fields, INCIDENT_LOG_TIMESTAMP_FIELD_CANDIDATES);
        const newValueField = this.findFieldByCandidates(fields, INCIDENT_LOG_NEWVALUE_FIELD_CANDIDATES);

        const payload: Record<string, any> = {
            Title: 'Incident Created',
        };

        if (workItemField) {
            if (
                workItemField.TypeAsString === 'Lookup' ||
                workItemField.TypeAsString === 'LookupMulti'
            ) {
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
            .items
            .add(payload);
    }

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

    private getIncidentTypeValue(value: any): IIncidentType | null {
        if (!value) return null;

        const item = Array.isArray(value) ? value[0] : value;

        if (!item?.Id || !item?.Title) return null;

        return {
            id: item.Id,
            title: item.Title,
            severity: item.Severity,
            department: normalizeDepartment(item.Department),
        };
    }

    private normalizeFieldName(value?: string): string {
        return (value ?? '')
            .replace(/_x0020_/gi, '')
            .replace(/\s+/g, '')
            .toLowerCase();
    }

    private normalizeRequestType(value?: string): TaskRequestType {
        return (value ?? '').toLowerCase() === 'incident'
            ? 'Incident'
            : 'Task';
    }

    private toWorkItemType(requestType: TaskRequestType): WorkItemType {
        return requestType === 'Incident' ? 'incident' : 'task';
    }

    // -----------------------------------------------------------------------
    // SLA helper methods
    // -----------------------------------------------------------------------

    private computeSlaStatus(responseDue: string, resolutionDue: string): string {
        if (!resolutionDue) return 'OnTrack';

        const now = new Date();
        const resDate = new Date(resolutionDue);
        const responseDate = responseDue ? new Date(responseDue) : null;

        if (resDate <= now) return 'Breached';
        if (responseDate && responseDate <= now) return 'AtRisk';

        const remainingMs = resDate.getTime() - now.getTime();
        const remainingHours = remainingMs / (1000 * 60 * 60);

        if (remainingHours <= TaskService.AT_RISK_REMAINING_HOURS) {
            return 'AtRisk';
        }

        return 'OnTrack';
    }

    private async getDepartmentRole(
        department: string,
        role: string
    ): Promise<{ id: number; name: string; email: string } | null> {
        try {
            const sp = getSP();

            const safeDepartment = department.replace(/'/g, "''");
            const safeRole = role.replace(/'/g, "''");

            const items: any[] = await sp.web.lists
                .getByTitle(USER_ROLE_LIST_TITLE)
                .items
                .filter(`Department eq '${safeDepartment}' and Role eq '${safeRole}' and IsActive eq 1`)
                .select('User/Id', 'User/Title', 'User/EMail')
                .expand('User')();

            if (items.length === 0) return null;

            const user = items[0].User;

            return {
                id: user.Id,
                name: user.Title,
                email: user.EMail,
            };
        } catch (error) {
            console.warn(`Failed to fetch ${role} for ${department}`, error);
            return null;
        }
    }

    private async logSlaEscalation(
        itemId: number,
        previousAssignee: string,
        newAssignee: string
    ): Promise<void> {
        const currentUserId = await this.getCurrentUserId();

        await this.addIncidentLog(
            itemId,
            'Escalation',
            'AssignedTo',
            previousAssignee,
            newAssignee,
            currentUserId
        );
    }

    private async getCurrentUserId(): Promise<number> {
        const sp = getSP();
        const user = await sp.web.currentUser();

        return (user as any).Id;
    }

    private async addIncidentLog(
        workItemId: number,
        action: string,
        fieldName: string | null,
        oldValue: string | null,
        newValue: string | null,
        performedById: number
    ): Promise<void> {
        const sp = getSP();

        const fields = await sp.web.lists
            .getByTitle(INCIDENT_LOG_LIST_TITLE)
            .fields
            .select('InternalName', 'Title', 'TypeAsString')();

        const workItemField = this.findFieldByCandidates(fields, INCIDENT_LOG_WORKITEM_FIELD_CANDIDATES);
        const actionField = this.findFieldByCandidates(fields, INCIDENT_LOG_ACTION_FIELD_CANDIDATES);
        const timestampField = this.findFieldByCandidates(fields, INCIDENT_LOG_TIMESTAMP_FIELD_CANDIDATES);
        const fieldNameField = this.findFieldByCandidates(fields, INCIDENT_LOG_FIELDNAME_FIELD_CANDIDATES);
        const oldValueField = this.findFieldByCandidates(fields, INCIDENT_LOG_OLDVALUE_FIELD_CANDIDATES);
        const newValueField = this.findFieldByCandidates(fields, INCIDENT_LOG_NEWVALUE_FIELD_CANDIDATES);
        const performedByField = this.findFieldByCandidates(fields, INCIDENT_LOG_PERFORMEDBY_FIELD_CANDIDATES);

        const payload: Record<string, any> = {};

        if (workItemField) {
            if (
                workItemField.TypeAsString === 'Lookup' ||
                workItemField.TypeAsString === 'LookupMulti'
            ) {
                payload[`${workItemField.InternalName}Id`] = workItemId;
            } else {
                payload[workItemField.InternalName] = workItemId;
            }
        }

        if (actionField) payload[actionField.InternalName] = action;
        if (timestampField) payload[timestampField.InternalName] = new Date().toISOString();
        if (fieldNameField) payload[fieldNameField.InternalName] = fieldName;
        if (oldValueField) payload[oldValueField.InternalName] = oldValue;
        if (newValueField) payload[newValueField.InternalName] = newValue;

        if (performedByField) {
            payload[`${performedByField.InternalName}Id`] = performedById;
        }

        await sp.web.lists
            .getByTitle(INCIDENT_LOG_LIST_TITLE)
            .items
            .add(payload);
    }
}