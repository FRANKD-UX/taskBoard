"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATA_SITE = exports.getSP = exports.initSP = void 0;
// Re-export the centralized SP service for backward compatibility.
var spService_1 = require("./services/spService");
Object.defineProperty(exports, "initSP", { enumerable: true, get: function () { return spService_1.initSP; } });
Object.defineProperty(exports, "getSP", { enumerable: true, get: function () { return spService_1.getSP; } });
Object.defineProperty(exports, "DATA_SITE", { enumerable: true, get: function () { return spService_1.DATA_SITE; } });
//# sourceMappingURL=pnpjsConfig.js.map