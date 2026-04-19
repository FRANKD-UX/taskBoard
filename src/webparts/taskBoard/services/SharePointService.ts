import { WebPartContext } from '@microsoft/sp-webpart-base';
import { spfi, SPFI } from '@pnp/sp';
import { SPFx } from '@pnp/sp/presets/all';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

export interface TaskItem {
    Id: number;
    Title: string;
    Status?: string;
    Priority?: string;
    DueDate?: string;
    StartDate?: string;  // ADDED: Start date field
    Description?: string;
    RequestType?: string;  // ADDED: Request type field
    Department?: string;   // ADDED: Department field
    Created?: string;      // ADDED: Created date
    AssignedTo?: {
        Id: number;
        Title: string;
        EMail?: string;
    };
    AssignedToId?: number;  // ADDED: Separate ID field for updates
    Author?: {
        Id: number;
        Title: string;
    };
}

export class SharePointService {
    private sp: SPFI;

    public constructor(context: WebPartContext) {
        this.sp = spfi().using(SPFx(context));
    }

    /**
     * Get all tasks from SharePoint
     */
    public async getTasks(): Promise<TaskItem[]> {
        try {
            const items = await this.sp.web.lists
                .getByTitle("Task Management System")
                .items
                .select(
                    'Id',
                    'Title',
                    'Status',
                    'Priority',
                    'DueDate',
                    'StartDate',           // ADDED
                    'Description',
                    'RequestType',          // ADDED
                    'Department',           // ADDED
                    'Created',              // ADDED
                    'AssignedTo/Id',
                    'AssignedTo/Title',
                    'AssignedTo/EMail',
                    'AssignedToId',         // ADDED
                    'Author/Id',
                    'Author/Title'
                )
                .expand('AssignedTo', 'Author')
                .orderBy('Created', false)
                .top(500)();

            console.log('SharePointService.getTasks - raw items:', items);
            return items as TaskItem[];
        } catch (error) {
            console.error('SharePointService.getTasks - error:', error);
            throw error;
        }
    }

    /**
     * Create a new task in SharePoint
     */
    public async createTask(task: any): Promise<{ id: number }> {
        try {
            console.log('SharePointService.createTask - payload:', task);

            const addData: any = {
                Title: task.title || 'New Task',
                Status: task.status || 'Unassigned',
                Priority: task.priority || 'Medium',
                RequestType: task.requestType || 'Task',
                Department: task.department || 'IT',
                Description: task.description || ''
            };

            // Only add these fields if they have values
            if (task.assignedTo) addData.AssignedToId = task.assignedToId;
            if (task.startDate) addData.StartDate = task.startDate;
            if (task.dueDate) addData.DueDate = task.dueDate;

            const result = await this.sp.web.lists
                .getByTitle("Task Management System")
                .items
                .add(addData);

            console.log('SharePointService.createTask - result:', result);
            return { id: result.data.Id };
        } catch (error) {
            console.error('SharePointService.createTask - error:', error);
            throw error;
        }
    }

    /**
     * Update an existing task in SharePoint
     */
    public async updateTask(id: number, task: any): Promise<void> {
        try {
            const updateData: any = {};

            // Map all fields that need to be updated
            if (task.title !== undefined) updateData.Title = task.title;
            if (task.status !== undefined) updateData.Status = task.status;
            if (task.priority !== undefined) updateData.Priority = task.priority;
            if (task.requestType !== undefined) updateData.RequestType = task.requestType;
            if (task.department !== undefined) updateData.Department = task.department;
            if (task.description !== undefined) updateData.Description = task.description;
            if (task.startDate !== undefined) updateData.StartDate = task.startDate;
            if (task.dueDate !== undefined) updateData.DueDate = task.dueDate;

            // Handle assigned user
            if (task.assignedToId !== undefined) {
                updateData.AssignedToId = task.assignedToId;
            }

            console.log('SharePointService.updateTask - id:', id, 'updateData:', updateData);

            await this.sp.web.lists
                .getByTitle("Task Management System")
                .items
                .getById(id)
                .update(updateData);
        } catch (error) {
            console.error('SharePointService.updateTask - error:', error);
            throw error;
        }
    }

    /**
     * Update only task status (for drag-and-drop)
     */
    public async updateTaskStatus(id: number, status: string): Promise<void> {
        try {
            await this.sp.web.lists
                .getByTitle("Task Management System")
                .items
                .getById(id)
                .update({ Status: status });
        } catch (error) {
            console.error('SharePointService.updateTaskStatus - error:', error);
            throw error;
        }
    }

    /**
     * Delete a task from SharePoint
     */
    public async deleteTask(id: number): Promise<void> {
        try {
            console.log('SharePointService.deleteTask - id:', id);
            await this.sp.web.lists
                .getByTitle("Task Management System")
                .items
                .getById(id)
                .delete();
        } catch (error) {
            console.error('SharePointService.deleteTask - error:', error);
            throw error;
        }
    }
}