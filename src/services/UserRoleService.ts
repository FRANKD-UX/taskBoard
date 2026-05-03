import { getSP } from '../pnpjsConfig';

// ---------------------------------------------------------------------------
// Role-based permission constants
//
// Centralised here so you only need to update one place when roles change.
// ---------------------------------------------------------------------------

const ASSIGNABLE_ROLES = new Set(['Owner', 'Manager', 'TeamLead']);
const CROSS_DEPARTMENT_ROLES = new Set(['Owner', 'Manager']);

// ---------------------------------------------------------------------------
// Columns that may not exist on older UserRoles list deployments.
//
// The primary query asks for all of them. If SP returns a 400 because one
// is missing, the fallback query requests only the core columns that are
// guaranteed to exist, and we derive permission flags from the role name
// instead.
// ---------------------------------------------------------------------------

const USER_ROLES_CORE_SELECT = [
    'Id',
    'Role',
    'Department',
    'IsActive',
    'User/Title',
    'User/EMail',
] as const;

const USER_ROLES_EXTENDED_SELECT = [
    ...USER_ROLES_CORE_SELECT,
    'CanAssign',
    'CanApprove',
    'IsDepartmentLead',
] as const;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface IUserRole {
    role: string;
    department?: string;
    email?: string;
    canAssign: boolean;
    canAssignAcrossDepartments: boolean;
    canApprove: boolean;
    isDepartmentLead: boolean;
}

// ---------------------------------------------------------------------------
// Internal SP item shape
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Pure mapping helper
//
// Separated from the fetch logic so both the primary and fallback paths
// go through the same mapping. No duplication, no drift.
// ---------------------------------------------------------------------------

const mapRoleItem = (item: IUserRoleListItem): IUserRole => {
    const role = item.Role || '';

    // If the SP list has explicit boolean columns, use them.
    // If those columns don't exist yet (fallback path), derive from the role
    // name so the app stays functional without needing a list schema update.
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

// ---------------------------------------------------------------------------
// Public function
// ---------------------------------------------------------------------------

export const getUserRole = async (email: string): Promise<IUserRole | null> => {
    const sp = getSP();

    // Escape single quotes in email addresses to prevent OData injection.
    const safeEmail = email.replace(/'/g, "''");

    const baseQuery = sp.web.lists
        .getByTitle('UserRoles')
        .items
        .expand('User')
        .filter(`User/EMail eq '${safeEmail}' and IsActive eq 1`)
        .top(1);

    // Primary attempt — request all columns including the optional permission flags.
    // If any of those columns don't exist on the list, SP returns a 400.
    try {
        const results = await baseQuery
            .select(...USER_ROLES_EXTENDED_SELECT)() as IUserRoleListItem[];

        const item = results[0];
        return item ? mapRoleItem(item) : null;

    } catch (primaryError) {
        console.warn(
            'UserRoleService: extended select failed (some columns may not exist on UserRoles). Falling back to core columns.',
            primaryError
        );
    }

    // Fallback — core columns only. Permission flags will be derived from
    // the role name via ASSIGNABLE_ROLES and CROSS_DEPARTMENT_ROLES above.
    try {
        const results = await baseQuery
            .select(...USER_ROLES_CORE_SELECT)() as IUserRoleListItem[];

        const item = results[0];
        return item ? mapRoleItem(item) : null;

    } catch (fallbackError) {
        console.error('UserRoleService: fallback query also failed.', fallbackError);
        return null;
    }
};