"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globalthis_1 = __importDefault(require("globalthis"));
const Logger_1 = require("../Logger");
const factories_1 = require("../factories");
const globalThis = (0, globalthis_1.default)();
const log = Logger_1.logger.child({
    namespace: 'bootstrap',
});
exports.default = (configurationInput) => {
    if (globalThis.GLOBAL_AGENT) {
        log.warn('found globalThis.GLOBAL_AGENT; second attempt to bootstrap global-agent was ignored');
        return false;
    }
    globalThis.GLOBAL_AGENT = (0, factories_1.createGlobalProxyAgent)(configurationInput);
    return true;
};
