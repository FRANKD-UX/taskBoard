"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserRole = void 0;
var tslib_1 = require("tslib");
var pnpjsConfig_1 = require("../pnpjsConfig");
var getUserRole = function (email) { return tslib_1.__awaiter(void 0, void 0, void 0, function () {
    var sp, safeEmail, roles, _a, item, fallbackCanAssign;
    var _b;
    return tslib_1.__generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                sp = (0, pnpjsConfig_1.getSP)();
                safeEmail = email.replace(/'/g, "''");
                roles = [];
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 5]);
                return [4 /*yield*/, sp.web.lists
                        .getByTitle('UserRoles')
                        .items.select('Id', 'Role', 'Department', 'CanAssign', 'CanApprove', 'IsDepartmentLead', 'IsActive', 'User/Title', 'User/EMail')
                        .expand('User')
                        .filter("User/EMail eq '".concat(safeEmail, "' and IsActive eq 1"))
                        .top(1)()];
            case 2:
                roles = (_c.sent());
                return [3 /*break*/, 5];
            case 3:
                _a = _c.sent();
                return [4 /*yield*/, sp.web.lists
                        .getByTitle('UserRoles')
                        .items.select('Id', 'Role', 'Department', 'IsActive', 'User/Title', 'User/EMail')
                        .expand('User')
                        .filter("User/EMail eq '".concat(safeEmail, "' and IsActive eq 1"))
                        .top(1)()];
            case 4:
                roles = (_c.sent());
                return [3 /*break*/, 5];
            case 5:
                item = roles[0];
                if (!item) {
                    return [2 /*return*/, null];
                }
                fallbackCanAssign = item.Role === 'Owner' || item.Role === 'Manager' || item.Role === 'TeamLead';
                return [2 /*return*/, {
                        role: item.Role || '',
                        department: item.Department,
                        email: (_b = item.User) === null || _b === void 0 ? void 0 : _b.EMail,
                        canAssign: item.CanAssign === true || fallbackCanAssign,
                        canApprove: item.CanApprove === true,
                        isDepartmentLead: item.IsDepartmentLead === true
                    }];
        }
    });
}); };
exports.getUserRole = getUserRole;
//# sourceMappingURL=UserRoleService.js.map