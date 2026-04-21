/**
 * Tool Registry
 *
 * Single source of truth for all tools.
 */
import { Tool, ToolCall } from './types.js';
/**
 * Get all base tools - single source of truth
 *
 * Always-present tools first, then feature-flagged tools.
 * Feature flags are resolved at bundle time for dead code elimination.
 */
export declare function getAllBaseTools(): Promise<Tool[]>;
/**
 * Assemble the final tool pool
 *
 * Sort built-ins and MCP tools separately, then concatenate.
 * This preserves API server prompt cache breakpoints.
 */
export declare function assembleToolPool(baseTools: Tool[], mcpTools: Tool[], denyRules: string[]): Tool[];
export declare class ToolRegistry {
    private tools;
    private aliases;
    register(tool: Tool): void;
    registerAlias(alias: string, target: string): void;
    lookup(name: string): Tool | undefined;
    getNames(): string[];
    getAll(): Tool[];
    /**
     * Check if a tool call is safe for concurrent execution
     * based on the tool's input-dependent classification
     */
    isConcurrencySafe(toolCall: ToolCall): boolean;
    /**
     * Check if a tool call is read-only
     */
    isReadOnly(toolCall: ToolCall): boolean;
}
export declare const toolRegistry: ToolRegistry;
//# sourceMappingURL=registry.d.ts.map