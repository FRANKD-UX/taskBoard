// DepartmentService.ts
import { getSP } from '../pnpjsConfig';

export class DepartmentService {
	private listName = 'Departments';

	public async getDepartments(): Promise<string[]> {
		const sp = getSP();
		try {
			const items = await sp.web.lists
				.getByTitle(this.listName)
				.items.select('Title')();
			return items.map((i: any) => i.Title).filter(Boolean);
		} catch (error) {
			console.error('[DepartmentService] failed:', error);
			// Fallback – keeps UI functional even if the list is missing
			return ['IT', 'Finance', 'Operations', 'Support'];
		}
	}
}