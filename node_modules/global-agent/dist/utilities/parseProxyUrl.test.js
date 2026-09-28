"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const parseProxyUrl_1 = __importDefault(require("./parseProxyUrl"));
(0, vitest_1.test)('extracts hostname', () => {
    (0, vitest_1.expect)((0, parseProxyUrl_1.default)('http://0.0.0.0').hostname).toBe('0.0.0.0');
});
(0, vitest_1.test)('extracts port', () => {
    (0, vitest_1.expect)((0, parseProxyUrl_1.default)('http://0.0.0.0:3000').port).toBe(3000);
});
(0, vitest_1.test)('extracts authorization', () => {
    (0, vitest_1.expect)((0, parseProxyUrl_1.default)('http://foo:bar@0.0.0.0').authorization).toBe('foo:bar');
});
(0, vitest_1.test)('throws an error if protocol is not "http:"', () => {
    (0, vitest_1.expect)(() => {
        (0, parseProxyUrl_1.default)('https://0.0.0.0:3000');
    }).toThrow('Unsupported `GLOBAL_AGENT.HTTP_PROXY` configuration value: URL protocol must be "http:".');
});
(0, vitest_1.test)('throws an error if query is present', () => {
    (0, vitest_1.expect)(() => {
        (0, parseProxyUrl_1.default)('http://0.0.0.0:3000/?foo=bar');
    }).toThrow('Unsupported `GLOBAL_AGENT.HTTP_PROXY` configuration value: URL must not have query.');
});
(0, vitest_1.test)('throws an error if hash is present', () => {
    (0, vitest_1.expect)(() => {
        (0, parseProxyUrl_1.default)('http://0.0.0.0:3000/#foo');
    }).toThrow('Unsupported `GLOBAL_AGENT.HTTP_PROXY` configuration value: URL must not have hash.');
});
