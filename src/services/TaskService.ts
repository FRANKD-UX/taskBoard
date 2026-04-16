import { getSP } from '../pnpjsConfig';

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
}

export class TaskService {
    public async getTasks(): Promise<ITask[]> {
        const sp = getSP();
        const items = await sp.web.lists
            .getByTitle('Tasks')
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
                'AssignedTo/Title',
                'AssignedTo/Id'
            )
            .expand('AssignedTo')
            ();

        return items.map((item: any) => ({
            id: item.Id,
            title: item.Title,
            status: item.Status,
            priority: item.Priority,
            assignedTo: item.AssignedTo?.Title,
            assignedToId: item.AssignedTo?.Id,
            startDate: item.StartDate,
            dueDate: item.DueDate,
            description: item.Description,
            requestType: item.RequestType,
            department: item.Department
        }));
    }

    async createTask(task: any): Promise<any> {
        const sp = getSP();

        const payload: any = {
            Title: task.title,
            Status: task.status,
            Priority: task.priority,
            DueDate: task.dueDate ? task.dueDate : null,
            Description: task.description,
            RequestType: task.requestType,
            Department: task.department
        };


        if (task.assignedToId) {
            payload.AssignedToId = task.assignedToId;
        }

        const result = await sp.web.lists
            .getByTitle("Tasks")
            .items.add(payload);

        return result.data;
    }

    public async updateTask(id: number, updates: Partial<ITask>): Promise<void> {
        const sp = getSP();
        const payload: Record<string, string | number | undefined | null> = {
            Title: updates.title,
            Status: updates.status,
            Priority: updates.priority,
            StartDate: updates.startDate,
            DueDate: updates.dueDate,
            Description: updates.description,
            RequestType: updates.requestType,
            Department: updates.department
        };

        if (updates.assignedToId !== undefined) {
            payload.AssignedToId = updates.assignedToId || null;
        }

        await sp.web.lists.getByTitle('Tasks').items.getById(id).update(payload);
    }

    public async deleteTask(id: number): Promise<void> {
        const sp = getSP();
        await sp.web.lists.getByTitle('Tasks').items.getById(id).delete();
    }
}
