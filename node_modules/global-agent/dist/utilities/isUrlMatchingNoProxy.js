"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const matcher_1 = __importDefault(require("matcher"));
const errors_1 = require("../errors");
exports.default = (subjectUrl, noProxy) => {
    const subjectUrlTokens = new URL(subjectUrl);
    const rules = noProxy.split(/[\s,]+/).filter(Boolean);
    for (const rule of rules) {
        const ruleMatch = rule
            .replace(/^(?<leadingDot>\.)/, '*')
            .match(/^(?<hostname>.+?)(?::(?<port>\d+))?$/);
        if (!ruleMatch || !ruleMatch.groups) {
            throw new errors_1.UnexpectedStateError('Invalid NO_PROXY pattern.');
        }
        if (!ruleMatch.groups.hostname) {
            throw new errors_1.UnexpectedStateError('NO_PROXY entry pattern must include hostname. Use * to match any hostname.');
        }
        const hostnameIsMatch = matcher_1.default.isMatch(subjectUrlTokens.hostname, ruleMatch.groups.hostname);
        if (hostnameIsMatch && (!ruleMatch.groups || !ruleMatch.groups.port || subjectUrlTokens.port && subjectUrlTokens.port === ruleMatch.groups.port)) {
            return true;
        }
    }
    return false;
};
