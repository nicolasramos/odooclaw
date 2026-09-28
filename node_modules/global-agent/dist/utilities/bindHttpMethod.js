"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
exports.default = (originalMethod, agent, forceGlobalAgent) => {
    return (...args) => {
        let url;
        let options;
        let callback;
        if (typeof args[0] === 'string' || args[0] instanceof URL) {
            url = args[0];
            if (typeof args[1] === 'function') {
                options = {};
                callback = args[1];
            }
            else {
                options = {
                    ...args[1],
                };
                callback = args[2];
            }
        }
        else {
            options = {
                ...args[0],
            };
            callback = args[1];
        }
        if (forceGlobalAgent) {
            options.agent = agent;
        }
        else {
            if (!options.agent) {
                options.agent = agent;
            }
            if (options.agent === http_1.default.globalAgent || options.agent === https_1.default.globalAgent) {
                options.agent = agent;
            }
        }
        if (url) {
            return originalMethod(url, options, callback);
        }
        else {
            return originalMethod(options, callback);
        }
    };
};
