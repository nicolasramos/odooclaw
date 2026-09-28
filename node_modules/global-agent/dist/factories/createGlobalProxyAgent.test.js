"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const net_1 = __importDefault(require("net"));
const vitest_1 = require("vitest");
const axios_1 = __importDefault(require("axios"));
const get_port_1 = __importDefault(require("get-port"));
const got_1 = __importDefault(require("got"));
const pem_1 = __importDefault(require("pem"));
const request_1 = __importDefault(require("request"));
const sinon_1 = require("sinon");
const createGlobalProxyAgent_1 = __importDefault(require("./createGlobalProxyAgent"));
const defaultHttpAgent = http_1.default.globalAgent;
const defaultHttpsAgent = https_1.default.globalAgent;
// Backup original value of NODE_TLS_REJECT_UNAUTHORIZED
// oxlint-disable-next-line node/no-process-env
const defaultNodeTlsRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
let lastPort = 3000;
let localProxyServers = [];
let localHttpServers = [];
let localHttpsServers = [];
let generatedCerts = null;
const getNextPort = () => {
    return (0, get_port_1.default)({
        port: get_port_1.default.makeRange(lastPort++, 3500),
    });
};
// Generate self-signed certificates for HTTPS testing
const generateCertificates = () => {
    return new Promise((resolve, reject) => {
        if (generatedCerts) {
            resolve(generatedCerts);
            return;
        }
        pem_1.default.createCertificate({ days: 1, selfSigned: true }, (error, keys) => {
            if (error) {
                reject(error);
                return;
            }
            generatedCerts = { cert: keys.certificate, key: keys.serviceKey };
            resolve(generatedCerts);
        });
    });
};
(0, vitest_1.beforeAll)(async () => {
    // Pre-generate certificates
    await generateCertificates();
});
(0, vitest_1.beforeEach)(() => {
    http_1.default.globalAgent = defaultHttpAgent;
    https_1.default.globalAgent = defaultHttpsAgent;
});
(0, vitest_1.afterEach)(() => {
    for (const localProxyServer of localProxyServers) {
        localProxyServer.stop();
    }
    localProxyServers = [];
    for (const localHttpServer of localHttpServers) {
        localHttpServer.stop();
    }
    localHttpServers = [];
    for (const localHttpsServer of localHttpsServers) {
        localHttpsServer.stop();
    }
    localHttpsServers = [];
    // Reset NODE_TLS_REJECT_UNAUTHORIZED to original value
    // oxlint-disable-next-line node/no-process-env
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = defaultNodeTlsRejectUnauthorized;
});
const createHttpResponseResolver = (resolve) => {
    return (response) => {
        let body = '';
        response.on('data', (data) => {
            body += data;
        });
        response.on('end', () => {
            if (!response.headers) {
                throw new Error('response.headers is not defined');
            }
            if (!response.statusCode) {
                throw new Error('response.statusCode is not defined');
            }
            resolve({
                body,
                headers: response.headers,
                statusCode: response.statusCode,
            });
        });
    };
};
// Create a local HTTPS server for CONNECT tunnel targets
const createHttpsServer = async () => {
    const port = await getNextPort();
    const certs = await generateCertificates();
    const localHttpsServer = await new Promise((resolve) => {
        const httpsServer = https_1.default.createServer({
            cert: certs.cert,
            key: certs.key,
        }, (request, response) => {
            response.writeHead(200, { 'content-type': 'text/plain' });
            response.end('OK');
        });
        httpsServer.listen(port, '127.0.0.1', () => {
            resolve({
                port,
                stop: () => {
                    httpsServer.close();
                },
                url: 'https://127.0.0.1:' + port,
            });
        });
    });
    localHttpsServers.push(localHttpsServer);
    return localHttpsServer;
};
// Create a simple HTTP proxy server that can handle both HTTP requests and HTTPS CONNECT tunneling
const createProxyServer = async (rules) => {
    const port = await getNextPort();
    // Create an HTTPS server that the proxy will tunnel to for CONNECT requests
    const httpsServer = await createHttpsServer();
    const localProxyServer = await new Promise((resolve) => {
        const proxyServer = http_1.default.createServer((request, response) => {
            // Handle regular HTTP proxy requests
            if (rules === null || rules === void 0 ? void 0 : rules.beforeSendRequest) {
                const result = rules.beforeSendRequest({
                    requestOptions: {
                        headers: request.headers,
                    },
                });
                response.writeHead(result.response.statusCode, result.response.header);
                response.end(result.response.body);
            }
            else {
                // Default response
                response.writeHead(200, { 'content-type': 'text/plain' });
                response.end('OK');
            }
        });
        // Handle CONNECT requests for HTTPS tunneling
        proxyServer.on('connect', (request, clientSocket, head) => {
            // Call onConnect hook if provided
            if (rules === null || rules === void 0 ? void 0 : rules.onConnect) {
                rules.onConnect(request);
            }
            // Connect to the local HTTPS server instead of the requested host
            const serverSocket = net_1.default.connect(httpsServer.port, '127.0.0.1', () => {
                clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
                serverSocket.write(head);
                serverSocket.pipe(clientSocket);
                clientSocket.pipe(serverSocket);
            });
            serverSocket.on('error', () => {
                clientSocket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
            });
            clientSocket.on('error', () => {
                serverSocket.end();
            });
        });
        proxyServer.listen(port, () => {
            resolve({
                httpsServer,
                port,
                stop: () => {
                    proxyServer.close();
                },
                url: 'http://127.0.0.1:' + port,
            });
        });
    });
    localProxyServers.push(localProxyServer);
    return localProxyServer;
};
const createHttpServer = async () => {
    const port = await getNextPort();
    const localHttpServer = await new Promise((resolve) => {
        const httpServer = http_1.default.createServer((request, response) => {
            response.end('DIRECT');
        });
        httpServer.listen(port, () => {
            resolve({
                stop: () => {
                    httpServer.close();
                },
                url: 'http://127.0.0.1:' + port,
            });
        });
    });
    localHttpServers.push(localHttpServer);
    return localHttpServer;
};
(0, vitest_1.test)('proxies HTTP request', async () => {
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const response = await new Promise((resolve) => {
        http_1.default.get('http://127.0.0.1', createHttpResponseResolver(resolve));
    });
    (0, vitest_1.expect)(response.body).toBe('OK');
});
(0, vitest_1.test)('proxies HTTP request with proxy-authorization header', async () => {
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const beforeSendRequest = (0, sinon_1.stub)().callsFake(() => {
        return {
            response: {
                body: 'OK',
                header: { 'content-type': 'text/plain' },
                statusCode: 200,
            },
        };
    });
    const proxyServer = await createProxyServer({
        beforeSendRequest,
    });
    globalProxyAgent.HTTP_PROXY = 'http://foo@127.0.0.1:' + proxyServer.port;
    const response = await new Promise((resolve) => {
        http_1.default.get('http://127.0.0.1', createHttpResponseResolver(resolve));
    });
    (0, vitest_1.expect)(response.body).toBe('OK');
    (0, vitest_1.expect)(beforeSendRequest.firstCall.args[0].requestOptions.headers['proxy-authorization']).toBe('Basic Zm9v');
});
(0, vitest_1.test)('Test reject unauthorized variable when NODE_TLS_REJECT_UNAUTHORIZED = undefined', async () => {
    // oxlint-disable-next-line node/no-process-env
    const { NODE_TLS_REJECT_UNAUTHORIZED, ...restEnvironments } = process.env; // oxlint-disable-line @typescript-eslint/no-unused-vars
    // oxlint-disable-next-line node/no-process-env
    process.env = restEnvironments;
    // oxlint-disable-next-line node/no-process-env
    process.env.GLOBAL_AGENT_FORCE_GLOBAL_AGENT = 'true';
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const globalAgent = https_1.default.globalAgent;
    (0, vitest_1.expect)(globalAgent.getRejectUnauthorized()).toBe(true);
    const response = await new Promise((resolve) => {
        http_1.default.get('http://127.0.0.1', createHttpResponseResolver(resolve));
    });
    (0, vitest_1.expect)(response.body).toBe('OK');
});
(0, vitest_1.test)('Test reject unauthorized variable when NODE_TLS_REJECT_UNAUTHORIZED = null', async () => {
    // oxlint-disable-next-line node/no-process-env
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 'null';
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const globalAgent = https_1.default.globalAgent;
    (0, vitest_1.expect)(globalAgent.getRejectUnauthorized()).toBe(false);
});
(0, vitest_1.test)('Test reject unauthorized variable when NODE_TLS_REJECT_UNAUTHORIZED = 1', async () => {
    // @ts-expect-error it is expected as we wanted to set process variable with int
    // oxlint-disable-next-line node/no-process-env
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 1;
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const globalAgent = https_1.default.globalAgent;
    (0, vitest_1.expect)(globalAgent.getRejectUnauthorized()).toBe(true);
});
(0, vitest_1.test)('Test reject unauthorized variable when NODE_TLS_REJECT_UNAUTHORIZED = 0', async () => {
    // @ts-expect-error it is expected as we wanted to set process variable with int
    // oxlint-disable-next-line node/no-process-env
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const globalAgent = https_1.default.globalAgent;
    (0, vitest_1.expect)(globalAgent.getRejectUnauthorized()).toBe(false);
});
(0, vitest_1.test)('Test reject unauthorized variable when NODE_TLS_REJECT_UNAUTHORIZED = true', async () => {
    // @ts-expect-error it is expected as we wanted to set process variable with boolean
    // oxlint-disable-next-line node/no-process-env
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = true;
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const globalAgent = https_1.default.globalAgent;
    (0, vitest_1.expect)(globalAgent.getRejectUnauthorized()).toBe(true);
});
(0, vitest_1.test)('Test reject unauthorized variable when NODE_TLS_REJECT_UNAUTHORIZED = false', async () => {
    // @ts-expect-error it is expected as we wanted to set process variable with boolean
    // oxlint-disable-next-line node/no-process-env
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = false;
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const globalAgent = https_1.default.globalAgent;
    (0, vitest_1.expect)(globalAgent.getRejectUnauthorized()).toBe(false);
});
(0, vitest_1.test)('Test reject unauthorized variable when NODE_TLS_REJECT_UNAUTHORIZED = yes', async () => {
    // oxlint-disable-next-line node/no-process-env
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 'yes';
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const globalAgent = https_1.default.globalAgent;
    (0, vitest_1.expect)(globalAgent.getRejectUnauthorized()).toBe(true);
});
(0, vitest_1.test)('Test reject unauthorized variable when NODE_TLS_REJECT_UNAUTHORIZED = no', async () => {
    // oxlint-disable-next-line node/no-process-env
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 'no';
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const globalAgent = https_1.default.globalAgent;
    (0, vitest_1.expect)(globalAgent.getRejectUnauthorized()).toBe(false);
});
(0, vitest_1.test)('Test addCACertificates and clearCACertificates methods', async () => {
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const globalAgent = https_1.default.globalAgent;
    (0, vitest_1.expect)(globalAgent.ca).toBe(undefined);
    globalAgent.addCACertificates(['test-ca-certficate1', 'test-ca-certficate2']);
    globalAgent.addCACertificates(['test-ca-certficate3']);
    const result = ['test-ca-certficate1', 'test-ca-certficate2', 'test-ca-certficate3'];
    (0, vitest_1.expect)(globalAgent.ca.length).toBe(result.length);
    (0, vitest_1.expect)(JSON.stringify(globalAgent.ca)).toBe(JSON.stringify(result));
    globalAgent.clearCACertificates();
    (0, vitest_1.expect)(globalAgent.ca).toBe(undefined);
});
(0, vitest_1.test)('Test addCACertificates when passed ca is a string', async () => {
    // oxlint-disable-next-line node/no-process-env
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const globalAgent = https_1.default.globalAgent;
    (0, vitest_1.expect)(globalAgent.ca).toBe(undefined);
    globalAgent.addCACertificates('test-ca-certficate1');
    globalAgent.addCACertificates('test-ca-certficate2');
    (0, vitest_1.expect)(globalAgent.ca).toBe('test-ca-certficate1test-ca-certficate2');
    const response = await new Promise((resolve) => {
        https_1.default.get('https://127.0.0.1', createHttpResponseResolver(resolve));
    });
    (0, vitest_1.expect)(response.body).toBe('OK');
});
(0, vitest_1.test)('Test addCACertificates when input ca is a string and existing ca is array', async () => {
    // oxlint-disable-next-line node/no-process-env
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)({ ca: ['test-ca'] });
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const globalAgent = https_1.default.globalAgent;
    (0, vitest_1.expect)(globalAgent.ca.length).toBe(1);
    globalAgent.addCACertificates('test-ca-certficate1');
    (0, vitest_1.expect)(globalAgent.ca.length).toBe(1);
    (0, vitest_1.expect)(JSON.stringify(globalAgent.ca)).toBe(JSON.stringify(['test-ca']));
    const response = await new Promise((resolve) => {
        https_1.default.get('https://127.0.0.1', createHttpResponseResolver(resolve));
    });
    (0, vitest_1.expect)(response.body).toBe('OK');
});
(0, vitest_1.test)('Test addCACertificates when input ca array is null or undefined', async () => {
    // oxlint-disable-next-line node/no-process-env
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const globalAgent = https_1.default.globalAgent;
    (0, vitest_1.expect)(globalAgent.ca).toBe(undefined);
    globalAgent.addCACertificates(undefined);
    globalAgent.addCACertificates(null);
    (0, vitest_1.expect)(globalAgent.ca).toBe(undefined);
    const response = await new Promise((resolve) => {
        https_1.default.get('https://127.0.0.1', createHttpResponseResolver(resolve));
    });
    (0, vitest_1.expect)(response.body).toBe('OK');
});
(0, vitest_1.test)('Test initializing ca certificate property while creating global proxy agent', async () => {
    // oxlint-disable-next-line node/no-process-env
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)({ ca: ['test-ca'] });
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const globalAgent = https_1.default.globalAgent;
    (0, vitest_1.expect)(globalAgent.ca.length).toBe(1);
    globalAgent.addCACertificates(['test-ca1']);
    (0, vitest_1.expect)(globalAgent.ca.length).toBe(2);
    (0, vitest_1.expect)(globalAgent.ca[0]).toBe('test-ca');
    (0, vitest_1.expect)(globalAgent.ca[1]).toBe('test-ca1');
    const response = await new Promise((resolve) => {
        https_1.default.get('https://127.0.0.1', createHttpResponseResolver(resolve));
    });
    (0, vitest_1.expect)(response.body).toBe('OK');
});
(0, vitest_1.test)('proxies HTTPS request', async () => {
    // oxlint-disable-next-line node/no-process-env
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const response = await new Promise((resolve) => {
        https_1.default.get('https://127.0.0.1', createHttpResponseResolver(resolve));
    });
    (0, vitest_1.expect)(response.body).toBe('OK');
});
(0, vitest_1.test)('proxies HTTPS request with proxy-authorization header', async () => {
    // oxlint-disable-next-line node/no-process-env
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const onConnect = (0, sinon_1.stub)();
    const proxyServer = await createProxyServer({
        onConnect,
    });
    globalProxyAgent.HTTP_PROXY = 'http://foo@127.0.0.1:' + proxyServer.port;
    const response = await new Promise((resolve) => {
        https_1.default.get('https://127.0.0.1', createHttpResponseResolver(resolve));
    });
    (0, vitest_1.expect)(response.body).toBe('OK');
    (0, vitest_1.expect)(onConnect.firstCall.args[0].headers['proxy-authorization']).toBe('Basic Zm9v');
});
(0, vitest_1.test)('does not produce unhandled rejection when cannot connect to proxy', async () => {
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const port = await getNextPort();
    globalProxyAgent.HTTP_PROXY = 'http://127.0.0.1:' + port;
    await (0, vitest_1.expect)((0, got_1.default)('http://127.0.0.1')).rejects.toThrow();
});
(0, vitest_1.test)('proxies HTTPS request with dedicated proxy', async () => {
    // oxlint-disable-next-line node/no-process-env
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTPS_PROXY = proxyServer.url;
    const response = await new Promise((resolve) => {
        https_1.default.get('https://127.0.0.1', createHttpResponseResolver(resolve));
    });
    (0, vitest_1.expect)(response.body).toBe('OK');
});
(0, vitest_1.test)('ignores dedicated HTTPS proxy for HTTP urls', async () => {
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    globalProxyAgent.HTTPS_PROXY = 'http://example.org';
    const response = await new Promise((resolve) => {
        http_1.default.get('http://127.0.0.1', {}, createHttpResponseResolver(resolve));
    });
    (0, vitest_1.expect)(response.body).toBe('OK');
});
(0, vitest_1.test)('forwards requests matching NO_PROXY', async () => {
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    const httpServer = await createHttpServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    globalProxyAgent.NO_PROXY = '127.0.0.1';
    const response = await new Promise((resolve) => {
        http_1.default.get(httpServer.url, createHttpResponseResolver(resolve));
    });
    (0, vitest_1.expect)(response.body).toBe('DIRECT');
});
(0, vitest_1.test)('forwards requests that go to a socket', async () => {
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    // not relevant as traffic shouldn't go through proxy
    globalProxyAgent.HTTP_PROXY = 'localhost:10324';
    const server = http_1.default.createServer((request, serverResponse) => {
        serverResponse.writeHead(200);
        serverResponse.write('OK');
        serverResponse.end();
    });
    server.listen('/tmp/test.sock');
    const response = await new Promise((resolve) => {
        http_1.default.get({
            path: '/endpoint',
            socketPath: '/tmp/test.sock',
        }, createHttpResponseResolver(resolve));
    });
    server.close();
    (0, vitest_1.expect)(response.body).toBe('OK');
});
(0, vitest_1.test)('proxies HTTP request (using http.get(host))', async () => {
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const response = await new Promise((resolve) => {
        http_1.default.get({
            host: '127.0.0.1',
        }, createHttpResponseResolver(resolve));
    });
    (0, vitest_1.expect)(response.body).toBe('OK');
});
(0, vitest_1.test)('proxies HTTP request (using got)', async () => {
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const response = await (0, got_1.default)('http://127.0.0.1');
    (0, vitest_1.expect)(response.body).toBe('OK');
});
(0, vitest_1.test)('proxies HTTPS request (using got)', async () => {
    // oxlint-disable-next-line node/no-process-env
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const response = await (0, got_1.default)('https://127.0.0.1');
    (0, vitest_1.expect)(response.body).toBe('OK');
});
(0, vitest_1.test)('proxies HTTP request (using axios)', async () => {
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const response = await axios_1.default.get('http://127.0.0.1');
    (0, vitest_1.expect)(response.data).toBe('OK');
});
(0, vitest_1.test)('proxies HTTPS request (using axios)', async () => {
    // oxlint-disable-next-line node/no-process-env
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const response = await axios_1.default.get('https://127.0.0.1');
    (0, vitest_1.expect)(response.data).toBe('OK');
});
(0, vitest_1.test)('proxies HTTP request (using request)', async () => {
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const response = await new Promise((resolve) => {
        (0, request_1.default)('http://127.0.0.1', (error, requestResponse, body) => {
            (0, vitest_1.expect)(error).toBe(null);
            resolve(body);
        });
    });
    (0, vitest_1.expect)(response).toBe('OK');
});
(0, vitest_1.test)('proxies HTTPS request (using request)', async () => {
    // oxlint-disable-next-line node/no-process-env
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const globalProxyAgent = (0, createGlobalProxyAgent_1.default)();
    const proxyServer = await createProxyServer();
    globalProxyAgent.HTTP_PROXY = proxyServer.url;
    const response = await new Promise((resolve) => {
        (0, request_1.default)('https://127.0.0.1', (error, requestResponse, body) => {
            (0, vitest_1.expect)(error).toBe(null);
            resolve(body);
        });
    });
    (0, vitest_1.expect)(response).toBe('OK');
});
