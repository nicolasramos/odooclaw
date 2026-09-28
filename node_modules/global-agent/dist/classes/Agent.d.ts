/// <reference types="node" />
/// <reference types="node" />
import type * as http from 'http';
import type * as https from 'https';
import type { AgentType, ConnectionCallbackType, ConnectionConfigurationType, GetUrlProxyMethodType, IsProxyConfiguredMethodType, MustUrlUseProxyMethodType, ProtocolType } from '../types';
type AgentRequestOptions = {
    host?: string;
    path?: string;
    port: number;
};
type HttpRequestOptions = AgentRequestOptions & Omit<http.RequestOptions, keyof AgentRequestOptions> & {
    secureEndpoint: false;
};
type HttpsRequestOptions = AgentRequestOptions & Omit<https.RequestOptions, keyof AgentRequestOptions> & {
    secureEndpoint: true;
};
type RequestOptions = HttpRequestOptions | HttpsRequestOptions;
declare abstract class Agent {
    defaultPort: number;
    protocol: ProtocolType;
    fallbackAgent: AgentType;
    isProxyConfigured: IsProxyConfiguredMethodType;
    mustUrlUseProxy: MustUrlUseProxyMethodType;
    getUrlProxy: GetUrlProxyMethodType;
    socketConnectionTimeout: number;
    ca: string[] | string | undefined;
    constructor(isProxyConfigured: IsProxyConfiguredMethodType, mustUrlUseProxy: MustUrlUseProxyMethodType, getUrlProxy: GetUrlProxyMethodType, fallbackAgent: AgentType, socketConnectionTimeout: number, ca: string[] | string | undefined);
    /**
     * This method can be used to append new ca certificates to existing ca certificates
     *
     * @param {string[] | string} ca a ca certificate or an array of ca certificates
     */
    addCACertificates(ca: string[] | string): void;
    /**
     * This method clears existing CA Certificates.
     * It sets ca to undefined
     */
    clearCACertificates(): void;
    /**
     * Evaluate value for tls reject unauthorized variable
     */
    getRejectUnauthorized(): boolean;
    abstract createConnection(configuration: ConnectionConfigurationType, callback: ConnectionCallbackType): void;
    addRequest(request: http.ClientRequest, configuration: RequestOptions): void;
}
export default Agent;
