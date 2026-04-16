"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharePointService = void 0;
var tslib_1 = require("tslib");
var sp_1 = require("@pnp/sp");
var all_1 = require("@pnp/sp/presets/all");
require("@pnp/sp/webs");
require("@pnp/sp/lists");
require("@pnp/sp/items");
var SharePointService = /** @class */ (function () {
    function SharePointService(context) {
        this.sp = (0, sp_1.spfi)().using((0, all_1.SPFx)(context));
    }
    SharePointService.prototype.getTasks = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var items;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.sp.web.lists
                            .getByTitle("Task Management System")
                            .items.select('Id', 'Title', 'Status', 'Priority', 'DueDate', 'Description', 'AssignedTo/Title')
                            .expand('AssignedTo')()];
                    case 1:
                        items = _a.sent();
                        return [2 /*return*/, items];
                }
            });
        });
    };
    SharePointService.prototype.updateTaskStatus = function (id, status) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.sp.web.lists.getByTitle("Task Management System").items.getById(id).update({
                            Status: status
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return SharePointService;
}());
exports.SharePointService = SharePointService;
//# sourceMappingURL=SharePointService.js.map