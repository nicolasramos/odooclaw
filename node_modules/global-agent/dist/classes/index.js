"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpsProxyAgent = exports.HttpProxyAgent = exports.Agent = void 0;
var Agent_1 = require("./Agent");
Object.defineProperty(exports, "Agent", { enumerable: true, get: function () { return __importDefault(Agent_1).default; } });
var HttpProxyAgent_1 = require("./HttpProxyAgent");
Object.defineProperty(exports, "HttpProxyAgent", { enumerable: true, get: function () { return __importDefault(HttpProxyAgent_1).default; } });
var HttpsProxyAgent_1 = require("./HttpsProxyAgent");
Object.defineProperty(exports, "HttpsProxyAgent", { enumerable: true, get: function () { return __importDefault(HttpsProxyAgent_1).default; } });
