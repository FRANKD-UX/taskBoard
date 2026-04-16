import { getSP } from '../pnpjsConfig';

export interface IUserRole {
  role: string;
  department?: string;
  email?: string;
  canAssign: boolean;
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

  try {
    roles = (await sp.web.lists
      .getByTitle('UserRoles')
      .items.select('Id', 'Role', 'Department', 'CanAssign', 'CanApprove', 'IsDepartmentLead', 'IsActive', 'User/Title', 'User/EMail')
      .expand('User')
      .filter(`User/EMail eq '${safeEmail}' and IsActive eq 1`)
      .top(1)()) as IUserRoleListItem[];
  } catch {
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

  const fallbackCanAssign = item.Role === 'Owner' || item.Role === 'Manager' || item.Role === 'TeamLead';

  return {
    role: item.Role || '',
    department: item.Department,
    email: item.User?.EMail,
    canAssign: item.CanAssign === true || fallbackCanAssign,
    canApprove: item.CanApprove === true,
    isDepartmentLead: item.IsDepartmentLead === true
  };
};
