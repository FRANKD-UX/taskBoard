"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSP = exports.initializePnP = void 0;
var sp_1 = require("@pnp/sp");
var spfx_1 = require("@pnp/sp/behaviors/spfx");
var spInstance = (0, sp_1.spfi)();
var initializePnP = function (context) {
    spInstance = (0, sp_1.spfi)().using((0, spfx_1.SPFx)(context));
};
exports.initializePnP = initializePnP;
var getSP = function () {
    return spInstance;
};
exports.getSP = getSP;
//# sourceMappingURL=pnpjsConfig.js.map