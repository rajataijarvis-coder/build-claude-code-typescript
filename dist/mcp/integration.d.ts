/**
 * MCP Integration with Tool System
 *
 * Wraps MCP tools to implement the internal Tool interface,
 * enabling seamless use alongside built-in tools.
 */
import { Tool } from '../tools/types.js';
import { z } from 'zod';
import { WrappedTool } from './types.js';
/**
 * Convert an MCP wrapped tool to internal Tool interface
 */
export declare function createMCPTool(wrapped: WrappedTool): Tool<z.ZodTypeAny, unknown, unknown>;
/**
 * Load all MCP tools and return as Tool array
 */
export declare function loadMCPTools(): Promise<Tool[]>;
/**
 * Initialize MCP connections from config
 */
export declare function initializeMCP(): Promise<void>;
/**
 * Get MCP connection status for UI display
 */
export declare function getMCPStatus(): Array<{
    name: string;
    state: string;
    toolCount: number;
    error?: string;
}>;
//# sourceMappingURL=integration.d.ts.map