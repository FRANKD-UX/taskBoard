"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATA_SITE = exports.getSP = exports.initSP = void 0;
var sp_1 = require("@pnp/sp");
require("@pnp/sp/webs");
var DATA_SITE = "https://skyfi.sharepoint.com/sites/Helpdesk";
exports.DATA_SITE = DATA_SITE;
var _sp = null;
/**
 * Initialize the singleton SPFI instance bound to the Helpdesk site.
 * Must be called once before any data operations.
 */
var initSP = function (context) {
    if (!_sp) {
        _sp = (0, sp_1.spfi)(DATA_SITE).using((0, sp_1.SPFx)(context));
        console.log("SP initialized for site:", DATA_SITE);
    }
};
exports.initSP = initSP;
/**
 * Returns the initialized SPFI instance.
 * Throws if initSP has not been called.
 */
var getSP = function () {
    if (!_sp) {
        throw new Error("SP not initialized. Call initSP(context) first.");
    }
    return _sp;
};
exports.getSP = getSP;
//# sourceMappingURL=spService.js.map