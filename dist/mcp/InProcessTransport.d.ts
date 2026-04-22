/**
 * In-Process Transport for MCP
 *
 * Enables MCP client and server to communicate within the same process
 * via direct function calls. Useful for built-in servers where spawning
 * a subprocess would be unnecessary overhead.
 *
 * The entire implementation is 63 lines. Key design decisions:
 * 1. queueMicrotask() prevents stack depth issues in sync request/response
 * 2. close() cascades to peer to prevent half-open states
 */
import { Transport, JSONRPCMessage, JSONRPCRequest, JSONRPCResponse } from './types.js';
interface InProcessPeer {
    onmessage?: (message: JSONRPCMessage) => void;
    onclose?: () => void;
    closed: boolean;
}
/**
 * In-process transport -- direct message passing within same process
 */
export declare class InProcessTransport implements Transport {
    closed: boolean;
    onmessage?: (message: JSONRPCMessage) => void;
    onclose?: () => void;
    private peer;
    /**
     * Link this transport with its peer (the other side of the connection)
     */
    link(peer: InProcessPeer): void;
    /**
     * Send a message to the peer
     * Uses queueMicrotask to prevent stack depth issues in sync cycles
     */
    send(message: JSONRPCMessage): Promise<void>;
    /**
     * Close the transport and notify peer
     */
    close(): Promise<void>;
}
/**
 * Create a linked transport pair for in-process communication
 * Returns [clientTransport, serverTransport] that are connected to each other
 */
export declare function createLinkedTransportPair(): [InProcessTransport, InProcessTransport];
/**
 * Simple in-process MCP server for testing
 */
export interface InProcessMCPServer {
    request(req: JSONRPCRequest): Promise<JSONRPCResponse>;
}
/**
 * Wrap an in-process server as a transport
 * The server receives requests and returns responses
 */
export declare function createServerTransport(server: InProcessMCPServer): InProcessTransport;
export {};
//# sourceMappingURL=InProcessTransport.d.ts.map