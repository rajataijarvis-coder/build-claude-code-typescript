/**
 * MCP Client
 *
 * Manages connections to MCP servers, handles tool discovery,
 * and executes tool calls with proper error handling.
 */
import { MCPServerConfig, MCPConnection, MCPToolResult } from './types.js';
import { WrappedTool } from './wrapper.js';
/**
 * MCP Client -- manages server connections and tool execution
 */
export declare class MCPClient {
    private connections;
    private requestId;
    private pendingRequests;
    /**
     * Connect to an MCP server
     */
    connect(config: MCPServerConfig): Promise<MCPConnection>;
    /**
     * Create appropriate transport based on config
     */
    private createTransport;
    /**
     * Establish connection and discover tools
     */
    private establishConnection;
    /**
     * Send JSON-RPC request and wait for response
     */
    private sendRequest;
    /**
     * Check if error indicates authentication is needed
     */
    private isAuthError;
    /**
     * Execute an MCP tool call
     */
    callTool(connectionId: string, toolName: string, args: Record<string, unknown>): Promise<MCPToolResult>;
    /**
     * Get all wrapped tools from a connection
     */
    getWrappedTools(connectionId: string): WrappedTool[];
    /**
     * Disconnect from a server
     */
    disconnect(connectionId: string): Promise<void>;
    /**
     * Get all active connections
     */
    getConnections(): MCPConnection[];
    /**
     * Generate unique connection ID
     */
    private generateConnectionId;
}
export declare function getMCPClient(): MCPClient;
//# sourceMappingURL=client.d.ts.map