// CollaboratorService.ts
//
// Owns all reads and writes against the TaskCollaborators SharePoint list.
// Nothing in this file knows about React — it is pure data access logic.
//
// The TaskCollaborators list schema (create this in SharePoint):
//   Title          - Single line  (label, e.g. "Task 42 - John Smith")
//   TaskId         - Number       (SP item ID of the task)
//   TaskTitle      - Single line  (denormalised task title for emails)
//   RequestedBy    - Person
//   Collaborator   - Person
//   Status         - Choice       (Pending | Accepted | Declined), default Pending
//   RequestedAt    - Date/Time
//   RespondedAt    - Date/Time    (blank until they respond)

import { getSP } from '../pnpjsConfig';
import type { ICollaborator, ICollaborationRequest, CollaborationStatus } from './TaskTypes';

// ---------------------------------------------------------------------------
// Internal SP response shape
// ---------------------------------------------------------------------------

interface ISPPersonField {
    Id?: number;
    Title?: string;
    EMail?: string;
    Email?: string;
    LoginName?: string;
}

interface ISPCollaboratorItem {
    Id: number;
    Title?: string;
    TaskId?: number;
    TaskTitle?: string;
    Status?: string;
    RequestedAt?: string;
    RespondedAt?: string;
    RequestedBy?: ISPPersonField;
    Collaborator?: ISPPersonField;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

const LIST_TITLE = 'TaskCollaborators';

const mapPersonField = (field: ISPPersonField | undefined): ICollaborator => ({
    id: field?.Id ?? null,
    name: field?.Title ?? '',
    email: field?.EMail ?? field?.Email ?? '',
    loginName: field?.LoginName ?? '',
});

const mapRequestItem = (item: ISPCollaboratorItem): ICollaborationRequest => ({
    requestId: item.Id,
    taskId: item.TaskId ?? 0,
    taskTitle: item.TaskTitle ?? '',
    collaborator: mapPersonField(item.Collaborator),
    requestedBy: mapPersonField(item.RequestedBy),
    status: (item.Status ?? 'Pending') as CollaborationStatus,
    requestedAt: item.RequestedAt ?? '',
    respondedAt: item.RespondedAt ?? undefined,
});

// ---------------------------------------------------------------------------
// CollaboratorService
// ---------------------------------------------------------------------------

export class CollaboratorService {

    // -----------------------------------------------------------------------
    // Fetch all collaboration requests for a given task.
    // Returns them sorted newest-first so the UI always shows the latest
    // request at the top.
    // -----------------------------------------------------------------------

    public async getRequestsForTask(taskId: number): Promise<ICollaborationRequest[]> {
        const sp = getSP();

        try {
            const items = await sp.web.lists
                .getByTitle(LIST_TITLE)
                .items
                .select(
                    'Id',
                    'Title',
                    'TaskId',
                    'TaskTitle',
                    'Status',
                    'RequestedAt',
                    'RespondedAt',
                    'RequestedBy/Id',
                    'RequestedBy/Title',
                    'RequestedBy/EMail',
                    'RequestedBy/LoginName',
                    'Collaborator/Id',
                    'Collaborator/Title',
                    'Collaborator/EMail',
                    'Collaborator/LoginName'
                )
                .expand('RequestedBy', 'Collaborator')
                .filter(`TaskId eq ${taskId}`)
                .orderBy('RequestedAt', false)
                .top(100)() as ISPCollaboratorItem[];

            return items.map(mapRequestItem);
        } catch (error) {
            console.error('CollaboratorService.getRequestsForTask failed', error);
            return [];
        }
    }

    // -----------------------------------------------------------------------
    // Fetch only the ACCEPTED collaborators for a task.
    // This is what the task card and "In Collaboration With" field use.
    // -----------------------------------------------------------------------

    public async getAcceptedCollaborators(taskId: number): Promise<ICollaborator[]> {
        const requests = await this.getRequestsForTask(taskId);
        return requests
            .filter((r) => r.status === 'Accepted')
            .map((r) => r.collaborator);
    }

    // -----------------------------------------------------------------------
    // Create a new Pending collaboration request.
    //
    // After this write succeeds, Power Automate picks it up and emails the
    // invited person with Accept / Decline buttons.
    // -----------------------------------------------------------------------

    public async createRequest(params: {
        taskId: number;
        taskTitle: string;
        collaboratorId: number;
        requestedById: number;
    }): Promise<ICollaborationRequest> {
        const sp = getSP();

        const { taskId, taskTitle, collaboratorId, requestedById } = params;

        const payload = {
            // Title is required by SP — we build a readable label.
            Title: `Task ${taskId} collaboration request`,
            TaskId: taskId,
            TaskTitle: taskTitle,
            // Person fields in SP REST use the Id-suffixed column name.
            CollaboratorId: collaboratorId,
            RequestedById: requestedById,
            Status: 'Pending',
            RequestedAt: new Date().toISOString(),
        };

        const result = await sp.web.lists
            .getByTitle(LIST_TITLE)
            .items.add(payload);

        const raw = result as any;
        const createdId: number =
            raw?.data?.Id ?? raw?.data?.ID ?? raw?.Id ?? raw?.ID ?? 0;

        // Re-fetch the created item so we return a fully shaped object
        // with the expanded person fields populated.
        if (createdId > 0) {
            const created = await this.getRequestById(createdId);
            if (created) return created;
        }

        // Fallback — return a synthetic object so the UI can still update
        // optimistically even if the re-fetch fails.
        return {
            requestId: createdId,
            taskId,
            taskTitle,
            collaborator: { id: collaboratorId, name: '', email: '', loginName: '' },
            requestedBy: { id: requestedById, name: '', email: '', loginName: '' },
            status: 'Pending',
            requestedAt: new Date().toISOString(),
        };
    }

    // -----------------------------------------------------------------------
    // Fetch a single request by its SP list item ID.
    // Used internally after createRequest to return a fully populated object.
    // -----------------------------------------------------------------------

    public async getRequestById(requestId: number): Promise<ICollaborationRequest | null> {
        const sp = getSP();

        try {
            const item = await sp.web.lists
                .getByTitle(LIST_TITLE)
                .items.getById(requestId)
                .select(
                    'Id',
                    'Title',
                    'TaskId',
                    'TaskTitle',
                    'Status',
                    'RequestedAt',
                    'RespondedAt',
                    'RequestedBy/Id',
                    'RequestedBy/Title',
                    'RequestedBy/EMail',
                    'RequestedBy/LoginName',
                    'Collaborator/Id',
                    'Collaborator/Title',
                    'Collaborator/EMail',
                    'Collaborator/LoginName'
                )
                .expand('RequestedBy', 'Collaborator')() as ISPCollaboratorItem;

            return mapRequestItem(item);
        } catch (error) {
            console.error('CollaboratorService.getRequestById failed', error);
            return null;
        }
    }

    // -----------------------------------------------------------------------
    // Cancel a Pending request.
    // Only the person who sent the request should be able to do this —
    // enforce that in the UI, not here, to keep this layer simple.
    // -----------------------------------------------------------------------

    public async cancelRequest(requestId: number): Promise<void> {
        const sp = getSP();
        await sp.web.lists
            .getByTitle(LIST_TITLE)
            .items.getById(requestId)
            .delete();
    }

    // -----------------------------------------------------------------------
    // Check whether a pending request already exists between this task
    // and this collaborator so we do not create duplicates.
    // -----------------------------------------------------------------------

    public async pendingRequestExists(taskId: number, collaboratorId: number): Promise<boolean> {
        const sp = getSP();

        try {
            const items = await sp.web.lists
                .getByTitle(LIST_TITLE)
                .items
                .select('Id')
                .filter(
                    `TaskId eq ${taskId} and CollaboratorId eq ${collaboratorId} and Status eq 'Pending'`
                )
                .top(1)();

            return items.length > 0;
        } catch {
            // If the check fails, let the create attempt proceed —
            // SP will handle any list-level constraints.
            return false;
        }
    }

    // -----------------------------------------------------------------------
    // Update the Collaborators multi-person field on the Tasks list after
    // a request is accepted via Power Automate.
    //
    // Power Automate handles this automatically via the flow, but we expose
    // this method so you can call it manually from the UI if you ever add
    // an in-app Accept flow later.
    // -----------------------------------------------------------------------

    public async addCollaboratorToTask(
        taskListTitle: string,
        taskSpId: number,
        collaboratorSpId: number
    ): Promise<void> {
        const sp = getSP();

        // Read the current collaborator IDs first so we do not overwrite them.
        const item = await sp.web.lists
            .getByTitle(taskListTitle)
            .items.getById(taskSpId)
            .select('CollaboratorsId')();

        const raw = item as any;
        const existing: number[] = raw?.CollaboratorsId?.results ?? raw?.CollaboratorsId ?? [];

        // Only add if not already present.
        if (existing.indexOf(collaboratorSpId) > -1) return;

        const updated = [...existing, collaboratorSpId];

        await sp.web.lists
            .getByTitle(taskListTitle)
            .items.getById(taskSpId)
            .update({ CollaboratorsId: { results: updated } });
    }
}