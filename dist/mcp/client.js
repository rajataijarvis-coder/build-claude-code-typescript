/**
 * MCP Client
 *
 * Manages connections to MCP servers, handles tool discovery,
 * and executes tool calls with proper error handling.
 */
import { isMcpSessionExpiredError, } from './types.js';
import { StdioTransport } from './StdioTransport.js';
import { HTTPTransport } from './HTTPTransport.js';
import { createLinkedTransportPair } from './InProcessTransport.js';
import { wrapMCPTool } from './wrapper.js';
// Request timeout
const REQUEST_TIMEOUT = 60000;
// Connection timeout
const CONNECTION_TIMEOUT = 30000;
/**
 * MCP Client -- manages server connections and tool execution
 */
export class MCPClient {
    connections = new Map();
    requestId = 0;
    pendingRequests = new Map();
    /**
     * Connect to an MCP server
     */
    async connect(config) {
        const id = this.generateConnectionId();
        const connection = {
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
        }
        catch (error) {
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
    async createTransport(config) {
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
                throw new Error(`Unsupported transport type: ${transport.type}`);
        }
    }
    /**
     * Establish connection and discover tools
     */
    async establishConnection(id, transport, config) {
        // Set up message handling
        transport.onmessage = (message) => {
            if ('id' in message && message.id !== undefined) {
                const pending = this.pendingRequests.get(message.id);
                if (pending) {
                    this.pendingRequests.delete(message.id);
                    pending.resolve(message);
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
        const toolsResult = await this.sendRequest(transport, 'tools/list', {});
        const connection = this.connections.get(id);
        if (connection) {
            connection.tools = toolsResult.tools;
        }
    }
    /**
     * Send JSON-RPC request and wait for response
     */
    async sendRequest(transport, method, params) {
        const id = ++this.requestId;
        const request = {
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
                    }
                    else {
                        resolve(response.result);
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
    isAuthError(error) {
        if (error instanceof Error) {
            // HTTP 401
            if ('code' in error && error.code === 401) {
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
    async callTool(connectionId, toolName, args) {
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
            const result = await this.sendRequest(transport, 'tools/call', { name: toolName, arguments: args });
            return {
                content: result.content,
                isError: result.isError,
            };
        }
        catch (error) {
            // Check for session expiry and retry once
            if (error instanceof Error && isMcpSessionExpiredError(error)) {
                // Retry after clearing session
                const result = await this.sendRequest(transport, 'tools/call', { name: toolName, arguments: args });
                return {
                    content: result.content,
                    isError: result.isError,
                };
            }
            throw error;
        }
        finally {
            await transport.close();
        }
    }
    /**
     * Get all wrapped tools from a connection
     */
    getWrappedTools(connectionId) {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            return [];
        }
        return connection.tools.map(tool => wrapMCPTool(tool, connection.config.name, (name, args) => this.callTool(connectionId, name, args)));
    }
    /**
     * Disconnect from a server
     */
    async disconnect(connectionId) {
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
    getConnections() {
        return Array.from(this.connections.values());
    }
    /**
     * Generate unique connection ID
     */
    generateConnectionId() {
        return `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }
}
/**
 * Create MCP client singleton
 */
let globalClient = null;
export function getMCPClient() {
    if (!globalClient) {
        globalClient = new MCPClient();
    }
    return globalClient;
}
//# sourceMappingURL=client.js.map