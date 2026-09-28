"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProxyController = exports.createGlobalProxyAgent = void 0;
var createGlobalProxyAgent_1 = require("./createGlobalProxyAgent");
Object.defineProperty(exports, "createGlobalProxyAgent", { enumerable: true, get: function () { return __importDefault(createGlobalProxyAgent_1).default; } });
var createProxyController_1 = require("./createProxyController");
Object.defineProperty(exports, "createProxyController", { enumerable: true, get: function () { return __importDefault(createProxyController_1).default; } });
