import { getSP } from '../pnpjsConfig';

// ---------------------------------------------------------------------------
// The set of roles that are permitted to assign tasks to other people.
// Keeping this as a constant makes it trivial to add new roles later.
// ---------------------------------------------------------------------------
const ASSIGNABLE_ROLES = new Set(['Owner', 'Manager', 'TeamLead']);

// Managers can assign across the entire company regardless of department.
const CROSS_DEPARTMENT_ROLES = new Set(['Owner', 'Manager']);

export interface IUserRole {
    role: string;
    department?: string;
    email?: string;
    /** True if this user can pick any assignee at all. */
    canAssign: boolean;
    /** True if this user can assign to people outside their own department. */
    canAssignAcrossDepartments: boolean;
    canApprove: boolean;
    isDepartmentLead: boolean;
}

interface IUserRoleListItem {
    Role?: string;
    Department?: string;
    CanAssign?: boolean;
    CanApprove?: boolean;
    IsDepartmentLead?: boolean;
    User?: {
        Title?: string;
        EMail?: string;
    };
}

export const getUserRole = async (email: string): Promise<IUserRole | null> => {
    const sp = getSP();
    const safeEmail = email.replace(/'/g, "''");

    let roles: IUserRoleListItem[] = [];

    // Primary attempt — select all columns including permission flags.
    try {
        roles = (await sp.web.lists
            .getByTitle('UserRoles')
            .items.select(
                'Id',
                'Role',
                'Department',
                'CanAssign',
                'CanApprove',
                'IsDepartmentLead',
                'IsActive',
                'User/Title',
                'User/EMail'
            )
            .expand('User')
            .filter(`User/EMail eq '${safeEmail}' and IsActive eq 1`)
            .top(1)()) as IUserRoleListItem[];
    } catch {
        // Fallback — some SP environments restrict certain column selects.
        roles = (await sp.web.lists
            .getByTitle('UserRoles')
            .items.select('Id', 'Role', 'Department', 'IsActive', 'User/Title', 'User/EMail')
            .expand('User')
            .filter(`User/EMail eq '${safeEmail}' and IsActive eq 1`)
            .top(1)()) as IUserRoleListItem[];
    }

    const item = roles[0] as IUserRoleListItem | undefined;

    if (!item) {
        return null;
    }

    const role = item.Role || '';

    // If the SP list has explicit boolean columns use them, otherwise derive
    // from the role name. This keeps backward compatibility with lists that
    // don't have CanAssign populated yet.
    const canAssign = item.CanAssign === true || ASSIGNABLE_ROLES.has(role);
    const canAssignAcrossDepartments = CROSS_DEPARTMENT_ROLES.has(role);

    return {
        role,
        department: item.Department,
        email: item.User?.EMail,
        canAssign,
        canAssignAcrossDepartments,
        canApprove: item.CanApprove === true,
        isDepartmentLead: item.IsDepartmentLead === true,
    };
};