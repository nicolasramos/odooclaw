/// <reference types="node" />
/// <reference types="node" />
import http from 'http';
import https from 'https';
type AgentType = http.Agent | https.Agent;
declare const _default: (originalMethod: Function, agent: AgentType, forceGlobalAgent: boolean) => (...args: any[]) => any;
export default _default;
