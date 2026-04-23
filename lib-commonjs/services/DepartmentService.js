"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentService = void 0;
var tslib_1 = require("tslib");
// DepartmentService.ts
var pnpjsConfig_1 = require("../pnpjsConfig");
var DepartmentService = /** @class */ (function () {
    function DepartmentService() {
        this.listName = 'Departments';
    }
    DepartmentService.prototype.getDepartments = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var sp, items, error_1;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sp = (0, pnpjsConfig_1.getSP)();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, sp.web.lists
                                .getByTitle(this.listName)
                                .items.select('Title')()];
                    case 2:
                        items = _a.sent();
                        return [2 /*return*/, items.map(function (i) { return i.Title; }).filter(Boolean)];
                    case 3:
                        error_1 = _a.sent();
                        console.error('[DepartmentService] failed:', error_1);
                        // Fallback – keeps UI functional even if the list is missing
                        return [2 /*return*/, ['IT', 'Finance', 'Operations', 'Support']];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return DepartmentService;
}());
exports.DepartmentService = DepartmentService;
//# sourceMappingURL=DepartmentService.js.map