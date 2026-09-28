"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const isUrlMatchingNoProxy_1 = __importDefault(require("./isUrlMatchingNoProxy"));
(0, vitest_1.test)('returns `true` if hosts match', () => {
    (0, vitest_1.expect)((0, isUrlMatchingNoProxy_1.default)('http://foo.com/', 'foo.com')).toBe(true);
});
(0, vitest_1.test)('returns `true` if hosts match (IP)', () => {
    (0, vitest_1.expect)((0, isUrlMatchingNoProxy_1.default)('http://127.0.0.1/', '127.0.0.1')).toBe(true);
});
(0, vitest_1.test)('returns `true` if hosts match (using asterisk wildcard)', () => {
    (0, vitest_1.expect)((0, isUrlMatchingNoProxy_1.default)('http://bar.foo.com/', '*.foo.com')).toBe(true);
});
(0, vitest_1.test)('returns `true` if domain matches (using dot wildcard)', () => {
    (0, vitest_1.expect)((0, isUrlMatchingNoProxy_1.default)('http://foo.com/', '.foo.com')).toBe(true);
});
(0, vitest_1.test)('returns `true` if subdomain matches (using dot wildcard)', () => {
    (0, vitest_1.expect)((0, isUrlMatchingNoProxy_1.default)('http://bar.foo.com/', '.foo.com')).toBe(true);
});
(0, vitest_1.test)('returns `true` if hosts match (*) and ports match', () => {
    (0, vitest_1.expect)((0, isUrlMatchingNoProxy_1.default)('http://foo.com:8080/', '*:8080')).toBe(true);
});
(0, vitest_1.test)('returns `true` if hosts and ports match', () => {
    (0, vitest_1.expect)((0, isUrlMatchingNoProxy_1.default)('http://foo.com:8080/', 'foo.com:8080')).toBe(true);
});
(0, vitest_1.test)('returns `true` if hosts match and NO_PROXY does not define port', () => {
    (0, vitest_1.expect)((0, isUrlMatchingNoProxy_1.default)('http://foo.com:8080/', 'foo.com')).toBe(true);
});
(0, vitest_1.test)('returns `true` if hosts (IP) and ports match', () => {
    (0, vitest_1.expect)((0, isUrlMatchingNoProxy_1.default)('http://127.0.0.1:8080/', '127.0.0.1:8080')).toBe(true);
});
(0, vitest_1.test)('returns `false` if hosts match and ports do not match (diffferent port)', () => {
    (0, vitest_1.expect)((0, isUrlMatchingNoProxy_1.default)('http://foo.com:8080/', 'foo.com:8000')).toBe(false);
});
(0, vitest_1.test)('returns `false` if hosts match and ports do not match (port not present subject)', () => {
    (0, vitest_1.expect)((0, isUrlMatchingNoProxy_1.default)('http://foo.com/', 'foo.com:8000')).toBe(false);
});
(0, vitest_1.test)('returns `true` if hosts match and ports do not match (port not present NO_PROXY)', () => {
    (0, vitest_1.expect)((0, isUrlMatchingNoProxy_1.default)('http://foo.com:8000/', 'foo.com')).toBe(true);
});
(0, vitest_1.test)('returns `true` if hosts match in one of multiple rules separated with a comma', () => {
    (0, vitest_1.expect)((0, isUrlMatchingNoProxy_1.default)('http://foo.com/', 'bar.org,foo.com,baz.io')).toBe(true);
});
(0, vitest_1.test)('returns `true` if hosts match in one of multiple rules separated with a comma and a space', () => {
    (0, vitest_1.expect)((0, isUrlMatchingNoProxy_1.default)('http://foo.com/', 'bar.org, foo.com, baz.io')).toBe(true);
});
(0, vitest_1.test)('returns `true` if hosts match in one of multiple rules separated with a space', () => {
    (0, vitest_1.expect)((0, isUrlMatchingNoProxy_1.default)('http://foo.com/', 'bar.org foo.com baz.io')).toBe(true);
});
(0, vitest_1.test)('handles trailing newline in NO_PROXY', () => {
    (0, vitest_1.expect)((0, isUrlMatchingNoProxy_1.default)('http://foo.com/', 'foo.com\n')).toBe(true);
});
(0, vitest_1.test)('handles trailing whitespace in NO_PROXY', () => {
    (0, vitest_1.expect)((0, isUrlMatchingNoProxy_1.default)('http://foo.com/', 'foo.com   ')).toBe(true);
});
(0, vitest_1.test)('handles leading whitespace in NO_PROXY', () => {
    (0, vitest_1.expect)((0, isUrlMatchingNoProxy_1.default)('http://foo.com/', '  foo.com')).toBe(true);
});
