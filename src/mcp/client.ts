/**
 * MCP Client
 * 
 * Manages connections to MCP servers, handles tool discovery,
 * and executes tool calls with proper error handling.
 */

import {
  MCPServerConfig,
  MCPConnection,
  MCPTool,
  MCPToolResult,
  Transport,
  JSONRPCRequest,
  JSONRPCResponse,
  ToolsListResult,
  ToolsCallResult,
  isMcpSessionExpiredError,
} from './types.js';
import { StdioTransport } from './StdioTransport.js';
import { HTTPTransport } from './HTTPTransport.js';
import { InProcessTransport, createLinkedTransportPair } from './InProcessTransport.js';
import { discoverOAuthMetadata, exchangeCodeForTokens, refreshAccessToken } from './auth.js';
import { wrapMCPTool, WrappedTool } from './wrapper.js';

// Request timeout
const REQUEST_TIMEOUT = 60000;

// Connection timeout
const CONNECTION_TIMEOUT = 30000;

/**
 * MCP Client -- manages server connections and tool execution
 */
export class MCPClient {
  private connections = new Map<string, MCPConnection>();
  private requestId = 0;
  private pendingRequests = new Map<number | string, {
    resolve: (value: JSONRPCResponse) => void;
    reject: (reason: Error) => void;
  }>();
  
  /**
   * Connect to an MCP server
   */
  async connect(config: MCPServerConfig): Promise<MCPConnection> {
    const id = this.generateConnectionId();
    
    const connection: MCPConnection = {
      id,
      config,
      state: 'connecting',
      tools: [],
    };
    
    this.connections.set(id, connection);
    
    try {
      const transport = await this.createTransport(config);
      await this.establishConnection(id, transport, config);
      
      connection.state = 'connected';
    } catch (error) {
      connection.state = 'failed';
      connection.error = error instanceof Error ? error.message : String(error);
      
      // Check if auth is needed
      if (this.isAuthError(error)) {
        connection.state = 'needs-auth';
      }
    }
    
    return connection;
  }
  
  /**
   * Create appropriate transport based on config
   */
  private async createTransport(config: MCPServerConfig): Promise<Transport> {
    const transport = config.transport;
    
    switch (transport.type) {
      case 'stdio':
        const stdioTransport = new StdioTransport({
          command: transport.command,
          args: transport.args,
          env: transport.env,
        });
        await stdioTransport.start();
        return stdioTransport;
        
      case 'http':
      case 'https':
        const httpTransport = new HTTPTransport({
          url: transport.url,
          headers: transport.headers,
          timeout: REQUEST_TIMEOUT,
        });
        await httpTransport.start();
        return httpTransport;
        
      case 'sse':
        const { SSETransport } = await import('./HTTPTransport.js');
        const sseTransport = new SSETransport({
          url: transport.url,
          headers: transport.headers,
        });
        await sseTransport.start();
        return sseTransport;
        
      case 'in-process':
        // For in-process, we need to create linked pair
        const [clientTransport] = createLinkedTransportPair();
        return clientTransport;
        
      default:
        throw new Error(`Unsupported transport type: ${(transport as { type: string }).type}`);
    }
  }
  
  /**
   * Establish connection and discover tools
   */
  private async establishConnection(
    id: string,
    transport: Transport,
    config: MCPServerConfig
  ): Promise<void> {
    // Set up message handling
    transport.onmessage = (message) => {
      if ('id' in message && message.id !== undefined) {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          this.pendingRequests.delete(message.id);
          pending.resolve(message as JSONRPCResponse);
        }
      }
    };
    
    transport.onerror = (error) => {
      console.error(`[MCP ${config.name}] Transport error:`, error);
    };
    
    transport.onclose = () => {
      const conn = this.connections.get(id);
      if (conn) {
        conn.state = 'failed';
        conn.error = 'Connection closed';
      }
    };
    
    // Discover tools
    const toolsResult = await this.sendRequest<ToolsListResult>(
      transport,
      'tools/list',
      {}
    );
    
    const connection = this.connections.get(id);
    if (connection) {
      connection.tools = toolsResult.tools;
    }
  }
  
  /**
   * Send JSON-RPC request and wait for response
   */
  private async sendRequest<T>(
    transport: Transport,
    method: string,
    params: unknown
  ): Promise<T> {
    const id = ++this.requestId;
    
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };
    
    return new Promise((resolve, reject) => {
      // Set up pending request
      this.pendingRequests.set(id, {
        resolve: (response) => {
          if (response.error) {
            reject(new Error(`JSON-RPC error ${response.error.code}: ${response.error.message}`));
          } else {
            resolve(response.result as T);
          }
        },
        reject,
      });
      
      // Send request
      transport.send(request).catch(reject);
      
      // Timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, REQUEST_TIMEOUT);
    });
  }
  
  /**
   * Check if error indicates authentication is needed
   */
  private isAuthError(error: unknown): boolean {
    if (error instanceof Error) {
      // HTTP 401
      if ('code' in error && (error as { code: number }).code === 401) {
        return true;
      }
      // Check message
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Execute an MCP tool call
   */
  async callTool(
    connectionId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<MCPToolResult> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }
    
    if (connection.state !== 'connected') {
      throw new Error(`Connection ${connectionId} is not connected (${connection.state})`);
    }
    
    // Re-create transport for this call
    const transport = await this.createTransport(connection.config);
    
    try {
      const result = await this.sendRequest<ToolsCallResult>(
        transport,
        'tools/call',
        { name: toolName, arguments: args }
      );
      
      return {
        content: result.content,
        isError: result.isError,
      };
    } catch (error) {
      // Check for session expiry and retry once
      if (error instanceof Error && isMcpSessionExpiredError(error)) {
        // Retry after clearing session
        const result = await this.sendRequest<ToolsCallResult>(
          transport,
          'tools/call',
          { name: toolName, arguments: args }
        );
        return {
          content: result.content,
          isError: result.isError,
        };
      }
      throw error;
    } finally {
      await transport.close();
    }
  }
  
  /**
   * Get all wrapped tools from a connection
   */
  getWrappedTools(connectionId: string): WrappedTool[] {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return [];
    }
    
    return connection.tools.map(tool =>
      wrapMCPTool(tool, connection.config.name, (name, args) =>
        this.callTool(connectionId, name, args)
      )
    );
  }
  
  /**
   * Disconnect from a server
   */
  async disconnect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (connection) {
      // Note: In a full implementation, we'd track the transport
      // and close it here
      connection.state = 'disabled';
    }
  }
  
  /**
   * Get all active connections
   */
  getConnections(): MCPConnection[] {
    return Array.from(this.connections.values());
  }
  
  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

/**
 * Create MCP client singleton
 */
let globalClient: MCPClient | null = null;

export function getMCPClient(): MCPClient {
  if (!globalClient) {
    globalClient = new MCPClient();
  }
  return globalClient;
}
