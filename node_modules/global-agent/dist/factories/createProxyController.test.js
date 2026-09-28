"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const createProxyController_1 = __importDefault(require("./createProxyController"));
(0, vitest_1.test)('sets HTTP_PROXY', () => {
    const globalAgentGlobal = (0, createProxyController_1.default)();
    globalAgentGlobal.HTTP_PROXY = 'http://127.0.0.1';
    (0, vitest_1.expect)(globalAgentGlobal.HTTP_PROXY).toBe('http://127.0.0.1');
});
(0, vitest_1.test)('sets HTTPS_PROXY', () => {
    const globalAgentGlobal = (0, createProxyController_1.default)();
    globalAgentGlobal.HTTPS_PROXY = 'http://127.0.0.1';
    (0, vitest_1.expect)(globalAgentGlobal.HTTPS_PROXY).toBe('http://127.0.0.1');
});
(0, vitest_1.test)('sets NO_PROXY', () => {
    const globalAgentGlobal = (0, createProxyController_1.default)();
    globalAgentGlobal.NO_PROXY = '*';
    (0, vitest_1.expect)(globalAgentGlobal.NO_PROXY).toBe('*');
});
(0, vitest_1.test)('throws an error if unknown property is set', () => {
    const globalAgentGlobal = (0, createProxyController_1.default)();
    (0, vitest_1.expect)(() => {
        // @ts-expect-error expected unknown property.
        globalAgentGlobal.FOO = 'BAR';
    }).toThrow('Cannot set an unmapped property "FOO".');
});
