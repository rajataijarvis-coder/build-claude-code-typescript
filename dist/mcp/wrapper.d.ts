/**
 * MCP Tool Wrapper
 *
 * Transforms MCP tool definitions into the internal Tool interface.
 * Handles: name normalization, description truncation, schema passthrough,
 * annotation mapping for concurrency hints.
 */
import { MCPTool, MCPToolResult, JSONSchema } from './types.js';
/**
 * Wrapped MCP tool for internal use
 */
export interface WrappedTool {
    name: string;
    originalName: string;
    description: string;
    inputSchema: JSONSchema;
    annotations?: {
        readOnlyHint?: boolean;
        destructiveHint?: boolean;
    };
    call: (input: unknown) => Promise<MCPToolResult>;
}
/**
 * Wrap an MCP tool for integration with the internal Tool system
 */
export declare function wrapMCPTool(tool: MCPTool, serverName: string, callTool: (name: string, args: Record<string, unknown>) => Promise<MCPToolResult>): WrappedTool;
/**
 * Create a fully qualified tool name
 * Format: mcp__{serverName}__{toolName}
 */
export declare function qualifyToolName(toolName: string, serverName: string): string;
/**
 * Normalize a name for MCP compatibility
 *
 * MCP tool names must match: ^[a-zA-Z0-9_-]{1,64}$
 * Invalid characters are replaced with underscores.
 */
export declare function normalizeNameForMCP(name: string): string;
/**
 * Compute signature for MCP server deduplication
 *
 * Two servers with different names but the same command/URL are
 * recognized as the same server for config deduplication.
 */
export declare function getMCPServerSignature(config: {
    transport: {
        type: string;
        command?: string;
        url?: string;
        args?: string[];
    };
}): string;
/**
 * Map MCP annotations to concurrency behavior
 *
 * readOnlyHint marks tools safe for concurrent execution.
 * destructiveHint triggers extra permission scrutiny.
 *
 * Note: These annotations come from the MCP server. A malicious server
 * could mark destructive tools as read-only. This is an accepted trust
 * boundary -- the user opted into the server.
 */
export declare function getConcurrencyBehavior(annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
}): {
    safeForConcurrency: boolean;
    requiresExtraPermission: boolean;
};
/**
 * Sanitize tool output for display
 *
 * Removes potentially malicious Unicode that could mislead the model:
 * - Bidirectional overrides (can flip text direction)
 * - Zero-width joiners (can hide characters)
 * - Control characters
 */
export declare function sanitizeToolOutput(text: string): string;
/**
 * Convert MCP tool result to string for model consumption
 */
export declare function formatToolResult(result: MCPToolResult): string;
//# sourceMappingURL=wrapper.d.ts.map