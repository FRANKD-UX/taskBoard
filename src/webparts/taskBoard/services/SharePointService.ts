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
  Description?: string;
  AssignedTo?: {
    Id: number;
    Title: string;
    EMail?: string;
  };
}

export class SharePointService {
  private sp: SPFI;

  public constructor(context: WebPartContext) {
    this.sp = spfi().using(SPFx(context));
  }

  public async getTasks(): Promise<TaskItem[]> {
    const items = await this.sp.web.lists
      .getByTitle("Task Management System")
      .items.select(
        'Id',
        'Title',
        'Status',
        'Priority',
        'DueDate',
        'Description',
        'AssignedTo/Title'
      )
      .expand('AssignedTo')();

    return items as TaskItem[];
  }

  public async updateTaskStatus(id: number, status: string): Promise<void> {
    await this.sp.web.lists.getByTitle("Task Management System").items.getById(id).update({
      Status: status
    });
  }
}
