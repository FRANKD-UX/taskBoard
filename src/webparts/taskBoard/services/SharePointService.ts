// src/webparts/taskBoard/services/SharePointService.ts
import { getSP } from "../../../pnpjsConfig";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";

export interface TaskItem {
    Id: number;
    Title: string;
    Status?: string;
    Priority?: string;
    DueDate?: string;
    StartDate?: string;
    Description?: string;
    RequestType?: string;
    Department?: string;
    Created?: string;
    AssignedTo?: {
        Id: number;
        Title: string;
        EMail?: string;
    };
    AssignedToId?: number;
    Author?: {
        Id: number;
        Title: string;
    };
}

export interface IncidentTypeItem {
    Id: number;
    Title: string;
    Severity?: string;
    Department?: string;
    IsActive?: boolean;
}

export class SharePointService {
    /**
     * Get all tasks from SharePoint
     */
    public async getTasks(): Promise<TaskItem[]> {
        const sp = getSP();
        try {
            const items = await sp.web.lists
                .getByTitle("Task Management System")
                .items
                .select(
                    'Id',
                    'Title',
                    'AssignedTo/Id',
                    'AssignedTo/Title',
                    'AssignedTo/EMail',
                    'AssignedToId'
                )
                .expand('AssignedTo')
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
     * Get active incident types from SharePoint
     */
    public async getIncidentTypes(department: string): Promise<IncidentTypeItem[]> {
        const sp = getSP();
        try {
            const sanitizedDepartment = department.replace(/'/g, "''");
            const items = await sp.web.lists
                .getByTitle("IncidentTypes")
                .items
                .select('Id', 'Title', 'Severity', 'Department', 'IsActive')
                .filter(`Department eq '${sanitizedDepartment}' and IsActive eq 1`)
                .orderBy('Title', true)();

            console.log('SharePointService.getIncidentTypes - raw items:', items);
            return items as IncidentTypeItem[];
        } catch (error) {
            console.error('SharePointService.getIncidentTypes - error:', error);
            throw error;
        }
    }

    /**
     * Create a new task in SharePoint
     */
    public async createTask(task: any): Promise<{ id: number }> {
        const sp = getSP();
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

            if (task.assignedToId != null) addData.AssignedToId = task.assignedToId;
            if (task.startDate) addData.StartDate = task.startDate;
            if (task.dueDate) addData.DueDate = task.dueDate;

            const result = await sp.web.lists
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
        const sp = getSP();
        try {
            const updateData: any = {};

            if (task.title !== undefined) updateData.Title = task.title;
            if (task.status !== undefined) updateData.Status = task.status;
            if (task.priority !== undefined) updateData.Priority = task.priority;
            if (task.requestType !== undefined) updateData.RequestType = task.requestType;
            if (task.department !== undefined) updateData.Department = task.department;
            if (task.description !== undefined) updateData.Description = task.description;
            if (task.startDate !== undefined) updateData.StartDate = task.startDate;
            if (task.dueDate !== undefined) updateData.DueDate = task.dueDate;

            if (task.assignedToId !== undefined) {
                updateData.AssignedToId = task.assignedToId;
            }

            console.log('SharePointService.updateTask - id:', id, 'updateData:', updateData);

            await sp.web.lists
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
        const sp = getSP();
        try {
            await sp.web.lists
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
        const sp = getSP();
        try {
            console.log('SharePointService.deleteTask - id:', id);
            await sp.web.lists
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