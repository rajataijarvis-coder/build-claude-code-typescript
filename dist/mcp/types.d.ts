/**
 * MCP Protocol Types
 *
 * Type definitions for the Model Context Protocol.
 * Based on the MCP specification: https://modelcontextprotocol.io
 */
/** JSON-RPC request ID */
export type RequestId = string | number;
/** JSON-RPC message base */
export interface JSONRPCMessage {
    jsonrpc: '2.0';
    id?: RequestId;
}
/** JSON-RPC request */
export interface JSONRPCRequest extends JSONRPCMessage {
    method: string;
    params?: unknown;
}
/** JSON-RPC response */
export interface JSONRPCResponse extends JSONRPCMessage {
    result?: unknown;
    error?: JSONRPCError;
}
/** JSON-RPC error */
export interface JSONRPCError {
    code: number;
    message: string;
    data?: unknown;
}
/** MCP tool definition from tools/list */
export interface MCPTool {
    name: string;
    description?: string;
    inputSchema: JSONSchema;
    annotations?: MCPToolAnnotations;
}
/** MCP tool annotations for behavior hints */
export interface MCPToolAnnotations {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
}
/** JSON Schema for tool inputs */
export interface JSONSchema {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
    description?: string;
    [key: string]: unknown;
}
/** MCP tool call result */
export interface MCPToolResult {
    content: Array<{
        type: string;
        text?: string;
        [key: string]: unknown;
    }>;
    isError?: boolean;
}
/** MCP transport interface -- abstracts communication mechanism */
export interface Transport {
    /** Send a message to the server */
    send(message: JSONRPCMessage): Promise<void>;
    /** Close the transport */
    close(): Promise<void>;
    /** Called when a message is received */
    onmessage?: (message: JSONRPCMessage) => void;
    /** Called when the transport closes */
    onclose?: () => void;
    /** Called when an error occurs */
    onerror?: (error: Error) => void;
    /** Whether the transport is closed */
    closed: boolean;
}
/** MCP server configuration */
export interface MCPServerConfig {
    name: string;
    transport: TransportConfig;
    auth?: OAuthConfig;
}
/** Transport configuration variants */
export type TransportConfig = StdioTransportConfig | HTTPTransportConfig | SSETransportConfig | WebSocketTransportConfig | InProcessTransportConfig;
/** stdio transport -- spawn a subprocess */
export interface StdioTransportConfig {
    type: 'stdio';
    command: string;
    args?: string[];
    env?: Record<string, string>;
}
/** HTTP transport -- Streamable HTTP (current spec) */
export interface HTTPTransportConfig {
    type: 'http' | 'https';
    url: string;
    headers?: Record<string, string>;
}
/** SSE transport -- legacy Server-Sent Events */
export interface SSETransportConfig {
    type: 'sse';
    url: string;
    headers?: Record<string, string>;
}
/** WebSocket transport */
export interface WebSocketTransportConfig {
    type: 'ws' | 'wss';
    url: string;
    headers?: Record<string, string>;
}
/** In-process transport -- direct function calls */
export interface InProcessTransportConfig {
    type: 'in-process';
    serverFactory: () => {
        request: (req: unknown) => Promise<unknown>;
    };
}
/** OAuth configuration for MCP servers */
export interface OAuthConfig {
    clientId?: string;
    clientSecret?: string;
    scopes?: string[];
    xaa?: boolean;
    authServerMetadataUrl?: string;
}
/** OAuth server metadata (RFC 8414) */
export interface OAuthServerMetadata {
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    token_endpoint_auth_methods_supported?: string[];
    scopes_supported?: string[];
}
/** OAuth token response */
export interface OAuthTokens {
    access_token: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
}
/** OAuth error response */
export interface OAuthErrorResponse {
    error: string;
    error_description?: string;
}
/** MCP connection states */
export type MCPConnectionState = 'connected' | 'connecting' | 'failed' | 'needs-auth' | 'disabled';
/** MCP connection info */
export interface MCPConnection {
    id: string;
    config: MCPServerConfig;
    state: MCPConnectionState;
    tools: MCPTool[];
    error?: string;
    lastAuthAttempt?: number;
}
/** Session expiry detection -- Streamable HTTP returns 404 with code -32001 */
export declare function isMcpSessionExpiredError(error: Error): boolean;
/** Configuration for tool name normalization */
export interface ToolWrapConfig {
    serverName: string;
    maxDescriptionLength: number;
}
/** Result of wrapping an MCP tool */
export interface WrappedTool {
    name: string;
    originalName: string;
    description: string;
    inputSchema: JSONSchema;
    annotations?: MCPToolAnnotations;
    call: (input: unknown) => Promise<MCPToolResult>;
}
/** tools/list request params */
export interface ToolsListParams {
    cursor?: string;
}
/** tools/list response */
export interface ToolsListResult {
    tools: MCPTool[];
    nextCursor?: string;
}
/** tools/call request params */
export interface ToolsCallParams {
    name: string;
    arguments?: Record<string, unknown>;
}
/** tools/call response */
export interface ToolsCallResult {
    content: Array<{
        type: string;
        text?: string;
    }>;
    isError?: boolean;
}
//# sourceMappingURL=types.d.ts.map