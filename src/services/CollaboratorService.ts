// CollaboratorService.ts
//
// Owns all reads and writes against the TaskCollaborators SharePoint list.
// All operations go through the centralized SP instance bound to the Helpdesk site.

import { getSP, DATA_SITE } from "../pnpjsConfig";
import type {
    ICollaborator,
    ICollaborationRequest,
    CollaborationStatus,
} from "../webparts/taskBoard/components/TaskTypes";

// ---------------------------------------------------------------------------
// SharePoint REST API shapes
// ---------------------------------------------------------------------------

interface ISPPersonField {
    Id?: number;
    Title?: string;
    EMail?: string;
    Email?: string;
}

interface ISPCollaboratorItem {
    Id: number;
    Title?: string;
    TaskId?: string;
    TaskTitle?: string;
    Status?: string;
    RequestedAt?: string;
    RespondedAt?: string;
    ResponseToken?: string;
    RequestedBy?: ISPPersonField;
    Collaborator?: ISPPersonField;
}

interface IPersonFieldNames {
    internalName: string;
    idSuffixName: string;
    isMulti: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIST_TITLE = 'TaskCollaborators';

const COLLABORATOR_FIELD_CANDIDATES = ['Collaborator', 'Collaborators'];
const REQUESTED_BY_FIELD_CANDIDATES = ['RequestedBy', 'Requested By', 'RequestedById'];

// ---------------------------------------------------------------------------
// Private pure helpers
// ---------------------------------------------------------------------------

const normalizeFieldName = (value?: string): string =>
    (value ?? '')
        .replace(/_x0020_/gi, '')
        .replace(/\s+/g, '')
        .toLowerCase();

const mapPersonField = (field: ISPPersonField | undefined): ICollaborator => ({
    id: field?.Id ?? null,
    name: field?.Title ?? '',
    email: field?.EMail ?? field?.Email ?? '',
    loginName: field?.Title ?? '',
});

const mapRequestItem = (item: ISPCollaboratorItem): ICollaborationRequest => ({
    requestId: item.Id,
    taskId: item.TaskId ? parseInt(item.TaskId, 10) : 0,
    taskTitle: item.TaskTitle ?? '',
    collaborator: mapPersonField(item.Collaborator),
    requestedBy: mapPersonField(item.RequestedBy),
    status: (item.Status ?? 'Pending') as CollaborationStatus,
    requestedAt: item.RequestedAt ?? '',
    respondedAt: item.RespondedAt ?? undefined,
});

const generateGuid = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

const buildPersonPayload = (
    userId: number,
    isMulti: boolean
): number[] | number =>
    isMulti ? [userId] : userId;

// ---------------------------------------------------------------------------
// CollaboratorService
// ---------------------------------------------------------------------------

export class CollaboratorService {

    private fieldNamesPromise?: Promise<{
        collaborator: IPersonFieldNames;
        requestedBy: IPersonFieldNames;
    }>;

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
                    'ResponseToken',
                    'RequestedBy/Id',
                    'RequestedBy/Title',
                    'RequestedBy/EMail',
                    'Collaborator/Id',
                    'Collaborator/Title',
                    'Collaborator/EMail'
                )
                .expand('RequestedBy', 'Collaborator')
                .filter(`TaskId eq '${taskId}'`)
                .orderBy('RequestedAt', false)
                .top(100)() as ISPCollaboratorItem[];

            return items.map(mapRequestItem);
        } catch (error) {
            console.error('CollaboratorService.getRequestsForTask failed', error);
            return [];
        }
    }

    public async getAcceptedCollaborators(taskId: number): Promise<ICollaborator[]> {
        const requests = await this.getRequestsForTask(taskId);
        return requests
            .filter((r) => r.status === 'Accepted')
            .map((r) => r.collaborator);
    }

    /**
     * Create a new collaboration request.
     * No longer requires siteAbsoluteUrl – uses the hard‑coded Helpdesk site.
     */
    public async createRequest(params: {
        taskId: number;
        taskTitle: string;
        collaboratorId: number;
        requestedById: number;
    }): Promise<ICollaborationRequest> {
        const { taskId, taskTitle, collaboratorId, requestedById } = params;

        const fieldNames = await this.getFieldNames();
        const responseToken = generateGuid();
        const todayIso = new Date().toISOString().split('T')[0];

        const payload: Record<string, unknown> = {
            Title: `Task ${taskId} collaboration request`,
            TaskId: String(taskId),
            TaskTitle: taskTitle,
            [fieldNames.collaborator.idSuffixName]: buildPersonPayload(
                collaboratorId,
                fieldNames.collaborator.isMulti
            ),
            [fieldNames.requestedBy.idSuffixName]: buildPersonPayload(
                requestedById,
                fieldNames.requestedBy.isMulti
            ),
            Status: 'Pending',
            RequestedAt: todayIso,
            ResponseToken: responseToken,
        };

        const listApiUrl = `${DATA_SITE}/_api/web/lists/getByTitle('${LIST_TITLE}')/items`;
        const contextInfoUrl = `${DATA_SITE}/_api/contextinfo`;

        const digestResponse = await fetch(contextInfoUrl, {
            method: 'POST',
            headers: { Accept: 'application/json;odata=verbose' },
            credentials: 'include',
        });

        if (!digestResponse.ok) {
            throw new Error(
                `Failed to fetch SP request digest: ${digestResponse.status} ${digestResponse.statusText}`
            );
        }

        const digestJson = await digestResponse.json() as any;
        const requestDigest: string =
            digestJson?.d?.GetContextWebInformation?.FormDigestValue ?? '';

        const addResponse = await fetch(listApiUrl, {
            method: 'POST',
            headers: {
                Accept: 'application/json;odata=nometadata',
                'Content-Type': 'application/json;odata=nometadata',
                'X-RequestDigest': requestDigest,
            },
            credentials: 'include',
            body: JSON.stringify(payload),
        });

        if (!addResponse.ok) {
            const errorText = await addResponse.text();
            console.error('CollaboratorService.createRequest: SP rejected the payload\n', errorText);
            throw new Error(`SP returned ${addResponse.status}: ${errorText}`);
        }

        const addedItem = await addResponse.json() as any;
        const createdId: number = addedItem?.Id ?? addedItem?.id ?? 0;

        if (createdId > 0) {
            const created = await this.getRequestById(createdId);
            if (created) return created;
        }

        return {
            requestId: createdId,
            taskId,
            taskTitle,
            collaborator: { id: collaboratorId, name: '', email: '', loginName: '' },
            requestedBy: { id: requestedById, name: '', email: '', loginName: '' },
            status: 'Pending',
            requestedAt: todayIso,
        };
    }

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
                    'ResponseToken',
                    'RequestedBy/Id',
                    'RequestedBy/Title',
                    'RequestedBy/EMail',
                    'Collaborator/Id',
                    'Collaborator/Title',
                    'Collaborator/EMail'
                )
                .expand('RequestedBy', 'Collaborator')() as ISPCollaboratorItem;

            return mapRequestItem(item);
        } catch (error) {
            console.error('CollaboratorService.getRequestById failed', error);
            return null;
        }
    }

    public async cancelRequest(requestId: number): Promise<void> {
        const sp = getSP();
        await sp.web.lists
            .getByTitle(LIST_TITLE)
            .items.getById(requestId)
            .delete();
    }

    public async pendingRequestExists(
        taskId: number,
        collaboratorId: number
    ): Promise<boolean> {
        const sp = getSP();
        try {
            const fieldNames = await this.getFieldNames();
            const items = await sp.web.lists
                .getByTitle(LIST_TITLE)
                .items
                .select('Id')
                .filter(
                    `TaskId eq '${taskId}' and ${fieldNames.collaborator.idSuffixName} eq ${collaboratorId} and Status eq 'Pending'`
                )
                .top(1)();

            return items.length > 0;
        } catch {
            return false;
        }
    }

    public async addCollaboratorToTask(
        taskListTitle: string,
        taskSpId: number,
        collaboratorSpId: number
    ): Promise<void> {
        const sp = getSP();
        const item = await sp.web.lists
            .getByTitle(taskListTitle)
            .items.getById(taskSpId)
            .select('CollaboratorsId')();

        const raw = item as any;
        const existing: number[] =
            raw?.CollaboratorsId?.results ?? raw?.CollaboratorsId ?? [];

        if (existing.includes(collaboratorSpId)) return;

        const updated = [...existing, collaboratorSpId];

        await sp.web.lists
            .getByTitle(taskListTitle)
            .items.getById(taskSpId)
            .update({ CollaboratorsId: { results: updated } });
    }

    // ---------------------------------------------------------------------------
    // Private — field name and type discovery
    // ---------------------------------------------------------------------------

    private getFieldNames(): Promise<{
        collaborator: IPersonFieldNames;
        requestedBy: IPersonFieldNames;
    }> {
        if (!this.fieldNamesPromise) {
            this.fieldNamesPromise = this.resolveFieldNames();
        }
        return this.fieldNamesPromise;
    }

    private async resolveFieldNames(): Promise<{
        collaborator: IPersonFieldNames;
        requestedBy: IPersonFieldNames;
    }> {
        const sp = getSP();
        let fields: any[] = [];

        try {
            fields = await sp.web.lists
                .getByTitle(LIST_TITLE)
                .fields
                .select('InternalName', 'Title', 'TypeAsString', 'AllowMultipleValues')
                .filter("TypeAsString eq 'User' or TypeAsString eq 'UserMulti'")();
        } catch (error) {
            console.warn(
                'CollaboratorService: could not load field schema, using default field names',
                error
            );
        }

        const resolve = (
            candidates: string[],
            fallbackInternalName: string,
            fallbackIsMulti: boolean
        ): IPersonFieldNames => {
            const match = fields.find((field: any) => {
                const normalizedInternal = normalizeFieldName(field.InternalName);
                const normalizedTitle = normalizeFieldName(field.Title);
                return candidates.some((candidate) => {
                    const normalizedCandidate = normalizeFieldName(candidate);
                    return (
                        normalizedInternal === normalizedCandidate ||
                        normalizedTitle === normalizedCandidate
                    );
                });
            });

            const internalName: string = match?.InternalName ?? fallbackInternalName;
            const isMulti: boolean =
                match !== undefined
                    ? match.TypeAsString === 'UserMulti' || match.AllowMultipleValues === true
                    : fallbackIsMulti;

            return {
                internalName,
                idSuffixName: `${internalName}Id`,
                isMulti,
            };
        };

        const result = {
            collaborator: resolve(COLLABORATOR_FIELD_CANDIDATES, 'Collaborator', true),
            requestedBy: resolve(REQUESTED_BY_FIELD_CANDIDATES, 'RequestedBy', false),
        };

        console.info('CollaboratorService: resolved field names', result);

        return result;
    }
}