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
export class InProcessTransport implements Transport {
  closed = false;
  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  
  private peer: InProcessPeer | null = null;
  
  /**
   * Link this transport with its peer (the other side of the connection)
   */
  link(peer: InProcessPeer): void {
    this.peer = peer;
  }
  
  /**
   * Send a message to the peer
   * Uses queueMicrotask to prevent stack depth issues in sync cycles
   */
  async send(message: JSONRPCMessage): Promise<void> {
    if (this.closed) {
      throw new Error('Transport is closed');
    }
    
    if (!this.peer) {
      throw new Error('Transport not linked to peer');
    }
    
    // Deliver via microtask to prevent synchronous stack overflow
    queueMicrotask(() => {
      if (!this.peer?.closed) {
        this.peer?.onmessage?.(message);
      }
    });
  }
  
  /**
   * Close the transport and notify peer
   */
  async close(): Promise<void> {
    if (this.closed) return;
    
    this.closed = true;
    this.onclose?.();
    
    // Cascade close to peer to prevent half-open state
    if (this.peer && !this.peer.closed) {
      this.peer.closed = true;
      this.peer.onclose?.();
    }
  }
}

/**
 * Create a linked transport pair for in-process communication
 * Returns [clientTransport, serverTransport] that are connected to each other
 */
export function createLinkedTransportPair(): [InProcessTransport, InProcessTransport] {
  const client = new InProcessTransport();
  const server = new InProcessTransport();
  
  // Link each transport to its peer
  client.link({
    get closed() { return server.closed; },
    onmessage: (msg) => server.onmessage?.(msg),
    onclose: () => server.onclose?.(),
  });
  
  server.link({
    get closed() { return client.closed; },
    onmessage: (msg) => client.onmessage?.(msg),
    onclose: () => client.onclose?.(),
  });
  
  return [client, server];
}

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
export function createServerTransport(server: InProcessMCPServer): InProcessTransport {
  const transport = new InProcessTransport();
  
  transport.onmessage = async (message) => {
    if ('method' in message) {
      // It's a request
      try {
        const response = await server.request(message as JSONRPCRequest);
        await transport.send({ ...response, jsonrpc: '2.0', id: message.id });
      } catch (error) {
        const errorResponse: JSONRPCResponse = {
          jsonrpc: '2.0',
          id: message.id ?? 0,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal error',
          },
        };
        await transport.send(errorResponse);
      }
    }
  };
  
  return transport;
}
