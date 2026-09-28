"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = __importDefault(require("net"));
const Agent_1 = __importDefault(require("./Agent"));
class HttpProxyAgent extends Agent_1.default {
    // @see https://github.com/sindresorhus/eslint-plugin-unicorn/issues/169#issuecomment-486980290
    constructor(isProxyConfigured, mustUrlUseProxy, getUrlProxy, fallbackAgent, socketConnectionTimeout, ca) {
        super(isProxyConfigured, mustUrlUseProxy, getUrlProxy, fallbackAgent, socketConnectionTimeout, ca);
        this.protocol = 'http:';
        this.defaultPort = 80;
    }
    createConnection(configuration, callback) {
        const socket = net_1.default.connect(configuration.proxy.port, configuration.proxy.hostname);
        callback(null, socket);
    }
}
exports.default = HttpProxyAgent;
