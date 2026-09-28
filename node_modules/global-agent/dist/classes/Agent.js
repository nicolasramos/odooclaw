"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = __importDefault(require("net"));
const serialize_error_1 = require("serialize-error");
const Logger_1 = require("../Logger");
const log = Logger_1.logger.child({
    namespace: 'Agent',
});
let requestId = 0;
class Agent {
    constructor(isProxyConfigured, mustUrlUseProxy, getUrlProxy, fallbackAgent, socketConnectionTimeout, ca) {
        this.fallbackAgent = fallbackAgent;
        this.isProxyConfigured = isProxyConfigured;
        this.mustUrlUseProxy = mustUrlUseProxy;
        this.getUrlProxy = getUrlProxy;
        this.socketConnectionTimeout = socketConnectionTimeout;
        this.ca = ca;
    }
    /**
     * This method can be used to append new ca certificates to existing ca certificates
     *
     * @param {string[] | string} ca a ca certificate or an array of ca certificates
     */
    addCACertificates(ca) {
        if (!ca) {
            log.error('Invalid input ca certificate');
        }
        else if (this.ca) {
            if (typeof ca === typeof this.ca) {
                // concat valid ca certificates with the existing certificates,
                if (typeof this.ca === 'string') {
                    this.ca = this.ca.concat(ca);
                }
                else {
                    this.ca = this.ca.concat(ca);
                }
            }
            else {
                log.error('Input ca certificate type mismatched with existing ca certificate type');
            }
        }
        else {
            this.ca = ca;
        }
    }
    /**
     * This method clears existing CA Certificates.
     * It sets ca to undefined
     */
    clearCACertificates() {
        this.ca = undefined;
    }
    /**
     * Evaluate value for tls reject unauthorized variable
     */
    getRejectUnauthorized() {
        // oxlint-disable-next-line node/no-process-env
        const rejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        let returnValue = true;
        if (typeof rejectUnauthorized === 'boolean') {
            returnValue = rejectUnauthorized;
        }
        else if (typeof rejectUnauthorized === 'number') {
            returnValue = rejectUnauthorized === 1;
        }
        else if (typeof rejectUnauthorized === 'string') {
            returnValue = ['true', 't', 'yes', 'y', 'on', '1'].includes(rejectUnauthorized.trim().toLowerCase());
        }
        return returnValue;
    }
    addRequest(request, configuration) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        let requestUrl;
        // It is possible that addRequest was constructed for a proxied request already, e.g.
        // "request" package does this when it detects that a proxy should be used
        // https://github.com/request/request/blob/212570b6971a732b8dd9f3c73354bcdda158a737/request.js#L402
        // https://gist.github.com/gajus/e2074cd3b747864ffeaabbd530d30218
        if ((_a = request.path.startsWith('http://')) !== null && _a !== void 0 ? _a : request.path.startsWith('https://')) {
            requestUrl = request.path;
        }
        else if (request.method === 'CONNECT') {
            requestUrl = 'https://' + request.path;
        }
        else {
            requestUrl = this.protocol + '//' + ((_b = configuration.hostname) !== null && _b !== void 0 ? _b : configuration.host) + (configuration.port === 80 || configuration.port === 443 ? '' : ':' + configuration.port) + request.path;
        }
        // If a request should go to a local socket, proxying it through an HTTP
        // server does not make sense as the information about the target socket
        // will be lost and the proxy won't be able to correctly handle the request.
        if (configuration.socketPath) {
            log.trace({
                destination: configuration.socketPath,
            }, 'not proxying request; destination is a socket');
            // @ts-expect-error seems like we are using wrong type for fallbackAgent.
            this.fallbackAgent.addRequest(request, configuration);
            return;
        }
        if (!this.isProxyConfigured()) {
            log.trace({
                destination: requestUrl,
            }, 'not proxying request; GLOBAL_AGENT.HTTP_PROXY is not configured');
            // @ts-expect-error seems like we are using wrong type for fallbackAgent.
            this.fallbackAgent.addRequest(request, configuration);
            return;
        }
        if (!this.mustUrlUseProxy(requestUrl)) {
            log.trace({
                destination: requestUrl,
            }, 'not proxying request; url matches GLOBAL_AGENT.NO_PROXY');
            // @ts-expect-error seems like we are using wrong type for fallbackAgent.
            this.fallbackAgent.addRequest(request, configuration);
            return;
        }
        const currentRequestId = requestId++;
        const proxy = this.getUrlProxy(requestUrl);
        if (this.protocol === 'http:') {
            request.path = requestUrl;
            if (proxy.authorization) {
                request.setHeader('proxy-authorization', 'Basic ' + Buffer.from(proxy.authorization).toString('base64'));
            }
        }
        log.trace({
            destination: requestUrl,
            proxy: 'http://' + proxy.hostname + ':' + proxy.port,
            requestId: currentRequestId,
        }, 'proxying request');
        request.on('error', (error) => {
            log.error({
                error: (0, serialize_error_1.serializeError)(error),
            }, 'request error');
        });
        request.once('response', (response) => {
            log.trace({
                headers: response.headers,
                requestId: currentRequestId,
                statusCode: response.statusCode,
            }, 'proxying response');
        });
        request.shouldKeepAlive = false;
        const connectionConfiguration = {
            host: (_d = (_c = configuration.hostname) !== null && _c !== void 0 ? _c : configuration.host) !== null && _d !== void 0 ? _d : '',
            port: (_e = configuration.port) !== null && _e !== void 0 ? _e : 80,
            proxy,
            tls: {},
        };
        // add optional tls options for https requests.
        // @see https://nodejs.org/docs/latest-v12.x/api/https.html#https_https_request_url_options_callback :
        // > The following additional options from tls.connect()
        // >   - https://nodejs.org/docs/latest-v12.x/api/tls.html#tls_tls_connect_options_callback -
        // > are also accepted:
        // >   ca, cert, ciphers, clientCertEngine, crl, dhparam, ecdhCurve, honorCipherOrder,
        // >   key, passphrase, pfx, rejectUnauthorized, secureOptions, secureProtocol, servername, sessionIdContext.
        if (configuration.secureEndpoint) {
            // Determine servername - Node.js doesn't allow IP addresses as servername
            const host = (_f = configuration.servername) !== null && _f !== void 0 ? _f : connectionConfiguration.host;
            const servername = net_1.default.isIP(host) ? undefined : host;
            connectionConfiguration.tls = {
                ca: (_g = configuration.ca) !== null && _g !== void 0 ? _g : this.ca,
                cert: configuration.cert,
                ciphers: configuration.ciphers,
                clientCertEngine: configuration.clientCertEngine,
                crl: configuration.crl,
                dhparam: configuration.dhparam,
                ecdhCurve: configuration.ecdhCurve,
                honorCipherOrder: configuration.honorCipherOrder,
                key: configuration.key,
                passphrase: configuration.passphrase,
                pfx: configuration.pfx,
                rejectUnauthorized: (_h = configuration.rejectUnauthorized) !== null && _h !== void 0 ? _h : this.getRejectUnauthorized(),
                secureOptions: configuration.secureOptions,
                secureProtocol: configuration.secureProtocol,
                servername,
                sessionIdContext: configuration.sessionIdContext,
            };
        }
        this.createConnection(connectionConfiguration, (error, socket) => {
            log.trace({
                target: connectionConfiguration,
            }, 'connecting');
            // @see https://github.com/nodejs/node/issues/5757#issuecomment-305969057
            if (socket) {
                socket.setTimeout(this.socketConnectionTimeout, () => {
                    socket.destroy();
                });
                socket.once('connect', () => {
                    log.trace({
                        target: connectionConfiguration,
                    }, 'connected');
                    socket.setTimeout(0);
                });
                socket.once('secureConnect', () => {
                    log.trace({
                        target: connectionConfiguration,
                    }, 'connected (secure)');
                    socket.setTimeout(0);
                });
            }
            if (error) {
                request.emit('error', error);
            }
            else if (socket) {
                log.debug('created socket');
                socket.on('error', (socketError) => {
                    log.error({
                        error: (0, serialize_error_1.serializeError)(socketError),
                    }, 'socket error');
                });
                request.onSocket(socket);
            }
        });
    }
}
exports.default = Agent;
