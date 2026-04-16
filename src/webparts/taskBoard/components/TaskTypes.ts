export type TaskStatus = 'Unassigned' | 'Backlog' | 'ThisWeek' | 'InProgress' | 'Completed';

export interface Task {
  id: string;
  title: string;
  assignedTo: string;
  assignedToId?: number;
  status: TaskStatus;
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  createdAt: string;
  requestType?: string;
  department?: string;
  description?: string;
  createdBy?: string;
}
