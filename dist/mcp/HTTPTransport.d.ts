/**
 * HTTP/SSE Transport for MCP
 *
 * Implements Streamable HTTP (current spec) and legacy SSE transport.
 * Includes timeout layering and session expiry detection.
 */
import { Transport, JSONRPCMessage } from './types.js';
export interface HTTPTransportOptions {
    url: string;
    headers?: Record<string, string>;
    timeout?: number;
}
/**
 * HTTP transport -- Streamable HTTP per MCP spec
 */
export declare class HTTPTransport implements Transport {
    private options;
    closed: boolean;
    onmessage?: (message: JSONRPCMessage) => void;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    private sessionId;
    private abortController;
    constructor(options: HTTPTransportOptions);
    /**
     * Start the transport (HTTP is connectionless, so this is a no-op)
     */
    start(): Promise<void>;
    /**
     * Send a message via HTTP POST
     */
    send(message: JSONRPCMessage): Promise<void>;
    /**
     * Handle Server-Sent Events stream
     */
    private handleSSEStream;
    /**
     * Close the transport
     */
    close(): Promise<void>;
}
/**
 * Legacy SSE transport -- pre-2025 specification
 */
export declare class SSETransport implements Transport {
    private options;
    closed: boolean;
    onmessage?: (message: JSONRPCMessage) => void;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    private eventSource;
    private messageQueue;
    private requestId;
    constructor(options: HTTPTransportOptions);
    /**
     * Start SSE connection
     */
    start(): Promise<void>;
    /**
     * Send a message (SSE is server->client only, so we use HTTP POST)
     */
    send(message: JSONRPCMessage): Promise<void>;
    /**
     * Close the transport
     */
    close(): Promise<void>;
}
//# sourceMappingURL=HTTPTransport.d.ts.map