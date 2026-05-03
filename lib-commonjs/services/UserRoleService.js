"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserRole = void 0;
var tslib_1 = require("tslib");
var pnpjsConfig_1 = require("../pnpjsConfig");
// ---------------------------------------------------------------------------
// Role-based permission constants
//
// Centralised here so you only need to update one place when roles change.
// ---------------------------------------------------------------------------
var ASSIGNABLE_ROLES = new Set(['Owner', 'Manager', 'TeamLead']);
var CROSS_DEPARTMENT_ROLES = new Set(['Owner', 'Manager']);
// ---------------------------------------------------------------------------
// Columns that may not exist on older UserRoles list deployments.
//
// The primary query asks for all of them. If SP returns a 400 because one
// is missing, the fallback query requests only the core columns that are
// guaranteed to exist, and we derive permission flags from the role name
// instead.
// ---------------------------------------------------------------------------
var USER_ROLES_CORE_SELECT = [
    'Id',
    'Role',
    'Department',
    'IsActive',
    'User/Title',
    'User/EMail',
];
var USER_ROLES_EXTENDED_SELECT = tslib_1.__spreadArray(tslib_1.__spreadArray([], USER_ROLES_CORE_SELECT, true), [
    'CanAssign',
    'CanApprove',
    'IsDepartmentLead',
], false);
// ---------------------------------------------------------------------------
// Pure mapping helper
//
// Separated from the fetch logic so both the primary and fallback paths
// go through the same mapping. No duplication, no drift.
// ---------------------------------------------------------------------------
var mapRoleItem = function (item) {
    var _a;
    var role = item.Role || '';
    // If the SP list has explicit boolean columns, use them.
    // If those columns don't exist yet (fallback path), derive from the role
    // name so the app stays functional without needing a list schema update.
    var canAssign = item.CanAssign === true || ASSIGNABLE_ROLES.has(role);
    var canAssignAcrossDepartments = CROSS_DEPARTMENT_ROLES.has(role);
    return {
        role: role,
        department: item.Department,
        email: (_a = item.User) === null || _a === void 0 ? void 0 : _a.EMail,
        canAssign: canAssign,
        canAssignAcrossDepartments: canAssignAcrossDepartments,
        canApprove: item.CanApprove === true,
        isDepartmentLead: item.IsDepartmentLead === true,
    };
};
// ---------------------------------------------------------------------------
// Public function
// ---------------------------------------------------------------------------
var getUserRole = function (email) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var sp, safeEmail, baseQuery, results, item, primaryError_1, results, item, fallbackError_1;
    return tslib_1.__generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                sp = (0, pnpjsConfig_1.getSP)();
                safeEmail = email.replace(/'/g, "''");
                baseQuery = sp.web.lists
                    .getByTitle('UserRoles')
                    .items
                    .expand('User')
                    .filter("User/EMail eq '".concat(safeEmail, "' and IsActive eq 1"))
                    .top(1);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, baseQuery
                        .select.apply(baseQuery, USER_ROLES_EXTENDED_SELECT)()];
            case 2:
                results = _a.sent();
                item = results[0];
                return [2 /*return*/, item ? mapRoleItem(item) : null];
            case 3:
                primaryError_1 = _a.sent();
                console.warn('UserRoleService: extended select failed (some columns may not exist on UserRoles). Falling back to core columns.', primaryError_1);
                return [3 /*break*/, 4];
            case 4:
                _a.trys.push([4, 6, , 7]);
                return [4 /*yield*/, baseQuery
                        .select.apply(baseQuery, USER_ROLES_CORE_SELECT)()];
            case 5:
                results = _a.sent();
                item = results[0];
                return [2 /*return*/, item ? mapRoleItem(item) : null];
            case 6:
                fallbackError_1 = _a.sent();
                console.error('UserRoleService: fallback query also failed.', fallbackError_1);
                return [2 /*return*/, null];
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.getUserRole = getUserRole;
//# sourceMappingURL=UserRoleService.js.map