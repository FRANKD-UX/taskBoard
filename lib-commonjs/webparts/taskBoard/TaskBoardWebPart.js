"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = tslib_1.__importStar(require("react"));
var ReactDom = tslib_1.__importStar(require("react-dom"));
var sp_core_library_1 = require("@microsoft/sp-core-library");
var sp_webpart_base_1 = require("@microsoft/sp-webpart-base");
require("@pnp/sp/webs");
require("@pnp/sp/lists");
require("@pnp/sp/items");
require("@pnp/sp/site-users/web");
var pnpjsConfig_1 = require("../../pnpjsConfig");
var TaskBoard_1 = tslib_1.__importDefault(require("./components/TaskBoard"));
var TaskBoardWebPart = /** @class */ (function (_super) {
    tslib_1.__extends(TaskBoardWebPart, _super);
    function TaskBoardWebPart() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TaskBoardWebPart.prototype.onInit = function () {
        (0, pnpjsConfig_1.initializePnP)(this.context);
        return _super.prototype.onInit.call(this);
    };
    TaskBoardWebPart.prototype.render = function () {
        var element = React.createElement(TaskBoard_1.default, {
            context: this.context
        });
        ReactDom.render(element, this.domElement);
    };
    TaskBoardWebPart.prototype.onDispose = function () {
        ReactDom.unmountComponentAtNode(this.domElement);
    };
    Object.defineProperty(TaskBoardWebPart.prototype, "dataVersion", {
        get: function () {
            return sp_core_library_1.Version.parse('1.0');
        },
        enumerable: false,
        configurable: true
    });
    return TaskBoardWebPart;
}(sp_webpart_base_1.BaseClientSideWebPart));
exports.default = TaskBoardWebPart;
//# sourceMappingURL=TaskBoardWebPart.js.map