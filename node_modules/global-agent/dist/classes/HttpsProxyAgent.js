"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = __importDefault(require("net"));
const tls_1 = __importDefault(require("tls"));
const Agent_1 = __importDefault(require("./Agent"));
class HttpsProxyAgent extends Agent_1.default {
    constructor(isProxyConfigured, mustUrlUseProxy, getUrlProxy, fallbackAgent, socketConnectionTimeout, ca) {
        super(isProxyConfigured, mustUrlUseProxy, getUrlProxy, fallbackAgent, socketConnectionTimeout, ca);
        this.protocol = 'https:';
        this.defaultPort = 443;
    }
    createConnection(configuration, callback) {
        const socket = net_1.default.connect(configuration.proxy.port, configuration.proxy.hostname);
        socket.on('error', (error) => {
            callback(error);
        });
        socket.once('data', (data) => {
            var _a;
            // Proxies with HTTPS as protocal are not allowed by parseProxyUrl(), so it should be safe to assume that the response is plain text
            const statusLine = data.toString().split('\r\n')[0];
            const statusLineExp = /^HTTP\/(\d)\.(\d) (\d{3}) ?(.*)$/;
            const statusCode = (_a = statusLineExp.exec(statusLine)) === null || _a === void 0 ? void 0 : _a[3];
            if (typeof statusCode === 'string' && Number(statusCode) >= 400) {
                const error = new Error(`Proxy server refused connecting to '${configuration.host}:${configuration.port}' (${statusLine})`);
                socket.destroy();
                callback(error);
                return;
            }
            const secureSocket = tls_1.default.connect({
                ...configuration.tls,
                socket,
            });
            callback(null, secureSocket);
        });
        let connectMessage = '';
        connectMessage += 'CONNECT ' + configuration.host + ':' + configuration.port + ' HTTP/1.1\r\n';
        connectMessage += 'Host: ' + configuration.host + ':' + configuration.port + '\r\n';
        if (configuration.proxy.authorization) {
            connectMessage += 'Proxy-Authorization: Basic ' + Buffer.from(configuration.proxy.authorization).toString('base64') + '\r\n';
        }
        connectMessage += '\r\n';
        socket.write(connectMessage);
    }
}
exports.default = HttpsProxyAgent;
