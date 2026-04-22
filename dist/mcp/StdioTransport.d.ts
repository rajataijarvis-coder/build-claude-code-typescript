/**
 * stdio Transport for MCP
 *
 * Spawns a subprocess and communicates via stdin/stdout.
 * This is the simplest and most common transport type.
 */
import { Transport, JSONRPCMessage } from './types.js';
export interface StdioTransportOptions {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
}
/**
 * stdio transport -- spawn subprocess and communicate over pipes
 */
export declare class StdioTransport implements Transport {
    private options;
    closed: boolean;
    onmessage?: (message: JSONRPCMessage) => void;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    private process;
    private buffer;
    constructor(options: StdioTransportOptions);
    /**
     * Start the subprocess and begin listening
     */
    start(): Promise<void>;
    /**
     * Process accumulated buffer for complete JSON-RPC messages
     */
    private processBuffer;
    /**
     * Send a message to the subprocess
     */
    send(message: JSONRPCMessage): Promise<void>;
    /**
     * Close the transport and kill the subprocess
     */
    close(): Promise<void>;
}
//# sourceMappingURL=StdioTransport.d.ts.map