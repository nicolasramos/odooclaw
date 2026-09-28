"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const gte_1 = __importDefault(require("semver/functions/gte"));
const Logger_1 = require("../Logger");
const classes_1 = require("../classes");
const errors_1 = require("../errors");
const utilities_1 = require("../utilities");
const parseBoolean_1 = require("../utilities/parseBoolean");
const createProxyController_1 = __importDefault(require("./createProxyController"));
const httpGet = http_1.default.get;
const httpRequest = http_1.default.request;
const httpsGet = https_1.default.get;
const httpsRequest = https_1.default.request;
const log = Logger_1.logger.child({
    namespace: 'createGlobalProxyAgent',
});
const defaultConfigurationInput = {
    environmentVariableNamespace: undefined,
    forceGlobalAgent: undefined,
    socketConnectionTimeout: 60000,
};
const createConfiguration = (configurationInput) => {
    // oxlint-disable-next-line node/no-process-env
    const environment = process.env;
    const defaultConfiguration = {
        environmentVariableNamespace: typeof environment.GLOBAL_AGENT_ENVIRONMENT_VARIABLE_NAMESPACE === 'string' ? environment.GLOBAL_AGENT_ENVIRONMENT_VARIABLE_NAMESPACE : 'GLOBAL_AGENT_',
        forceGlobalAgent: typeof environment.GLOBAL_AGENT_FORCE_GLOBAL_AGENT === 'string' ? (0, parseBoolean_1.parseBoolean)(environment.GLOBAL_AGENT_FORCE_GLOBAL_AGENT) : true,
        socketConnectionTimeout: typeof environment.GLOBAL_AGENT_SOCKET_CONNECTION_TIMEOUT === 'string' ? Number.parseInt(environment.GLOBAL_AGENT_SOCKET_CONNECTION_TIMEOUT, 10) : defaultConfigurationInput.socketConnectionTimeout,
    };
    return {
        ...defaultConfiguration,
        ...Object.fromEntries(Object.entries(configurationInput).filter(([, v]) => v !== undefined)),
    };
};
exports.default = (configurationInput = defaultConfigurationInput) => {
    var _a, _b, _c;
    const configuration = createConfiguration(configurationInput);
    if (configurationInput.logger) {
        (0, Logger_1.setLogger)(configurationInput.logger);
    }
    const proxyController = (0, createProxyController_1.default)();
    // oxlint-disable-next-line node/no-process-env
    proxyController.HTTP_PROXY = (_a = process.env[configuration.environmentVariableNamespace + 'HTTP_PROXY']) !== null && _a !== void 0 ? _a : null;
    // oxlint-disable-next-line node/no-process-env
    proxyController.HTTPS_PROXY = (_b = process.env[configuration.environmentVariableNamespace + 'HTTPS_PROXY']) !== null && _b !== void 0 ? _b : null;
    // oxlint-disable-next-line node/no-process-env
    proxyController.NO_PROXY = (_c = process.env[configuration.environmentVariableNamespace + 'NO_PROXY']) !== null && _c !== void 0 ? _c : null;
    log.info({
        configuration,
        state: proxyController,
    }, 'global agent has been initialized');
    const mustUrlUseProxy = (getProxy) => {
        return (url) => {
            if (!getProxy()) {
                return false;
            }
            if (!proxyController.NO_PROXY) {
                return true;
            }
            return !(0, utilities_1.isUrlMatchingNoProxy)(url, proxyController.NO_PROXY);
        };
    };
    const getUrlProxy = (getProxy) => {
        return () => {
            const proxy = getProxy();
            if (!proxy) {
                throw new errors_1.UnexpectedStateError('HTTP(S) proxy must be configured.');
            }
            return (0, utilities_1.parseProxyUrl)(proxy);
        };
    };
    const getHttpProxy = () => {
        return proxyController.HTTP_PROXY;
    };
    const BoundHttpProxyAgent = class extends classes_1.HttpProxyAgent {
        constructor() {
            super(() => {
                return Boolean(getHttpProxy());
            }, mustUrlUseProxy(getHttpProxy), getUrlProxy(getHttpProxy), http_1.default.globalAgent, configuration.socketConnectionTimeout, configuration.ca);
        }
    };
    const httpAgent = new BoundHttpProxyAgent();
    const getHttpsProxy = () => {
        var _a;
        return (_a = proxyController.HTTPS_PROXY) !== null && _a !== void 0 ? _a : proxyController.HTTP_PROXY;
    };
    const BoundHttpsProxyAgent = class extends classes_1.HttpsProxyAgent {
        constructor() {
            super(() => {
                return Boolean(getHttpsProxy());
            }, mustUrlUseProxy(getHttpsProxy), getUrlProxy(getHttpsProxy), https_1.default.globalAgent, configuration.socketConnectionTimeout, configuration.ca);
        }
    };
    const httpsAgent = new BoundHttpsProxyAgent();
    // Overriding globalAgent was added in v11.7.
    // @see https://nodejs.org/uk/blog/release/v11.7.0/
    if ((0, gte_1.default)(process.version, 'v11.7.0')) {
        // @see https://github.com/facebook/flow/issues/7670
        // @ts-expect-error Node.js version compatibility
        http_1.default.globalAgent = httpAgent;
        // @ts-expect-error Node.js version compatibility
        https_1.default.globalAgent = httpsAgent;
    }
    // The reason this logic is used in addition to overriding http(s).globalAgent
    // is because there is no guarantee that we set http(s).globalAgent variable
    // before an instance of http(s).Agent has been already constructed by someone,
    // e.g. Stripe SDK creates instances of http(s).Agent at the top-level.
    // @see https://github.com/gajus/global-agent/pull/13
    //
    // We still want to override http(s).globalAgent when possible to enable logic
    // in `bindHttpMethod`.
    if ((0, gte_1.default)(process.version, 'v10.0.0')) {
        // @ts-expect-error seems like we are using wrong type for httpAgent
        http_1.default.get = (0, utilities_1.bindHttpMethod)(httpGet, httpAgent, configuration.forceGlobalAgent);
        // @ts-expect-error seems like we are using wrong type for httpAgent
        http_1.default.request = (0, utilities_1.bindHttpMethod)(httpRequest, httpAgent, configuration.forceGlobalAgent);
        // @ts-expect-error seems like we are using wrong type for httpAgent
        https_1.default.get = (0, utilities_1.bindHttpMethod)(httpsGet, httpsAgent, configuration.forceGlobalAgent);
        // @ts-expect-error seems like we are using wrong type for httpAgent
        https_1.default.request = (0, utilities_1.bindHttpMethod)(httpsRequest, httpsAgent, configuration.forceGlobalAgent);
    }
    else {
        log.warn('attempt to initialize global-agent in unsupported Node.js version was ignored');
    }
    return proxyController;
};
