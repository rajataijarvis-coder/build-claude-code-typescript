/**
 * Tool Registry
 *
 * Single source of truth for all tools.
 */

import { Tool, ToolCall } from './types.js';

/**
 * Feature flag check (simplified - would check actual feature flags)
 */
function isFeatureEnabled(feature: string): boolean {
  // In production, this would check feature flags
  // For now, all features are enabled in development
  return process.env.NODE_ENV === 'development' || process.env[`ENABLE_${feature}`] === 'true';
}

/**
 * Get all base tools - single source of truth
 *
 * Always-present tools first, then feature-flagged tools.
 * Feature flags are resolved at bundle time for dead code elimination.
 */
export async function getAllBaseTools(): Promise<Tool[]> {
  // Dynamically import tool definitions to avoid circular dependencies
  const [{ ReadFileTool }, { WriteFileTool }, { BashTool }, { GrepTool }, { GlobTool }] = await Promise.all([
    import('./definitions/ReadFileTool.js'),
    import('./definitions/WriteFileTool.js'),
    import('./definitions/BashTool.js'),
    import('./definitions/GrepTool.js'),
    import('./definitions/GlobTool.js'),
  ]);

  const tools: (Tool | null)[] = [
    // Always-present built-in tools
    ReadFileTool,
    WriteFileTool,
    BashTool,
    GrepTool,
    GlobTool,

    // Feature-flagged tools would go here
    // isFeatureEnabled('PROACTIVE') ? SleepTool : null,
    // isFeatureEnabled('AGENT_SWARMS') ? AgentTool : null,
    // isFeatureEnabled('MCP') ? MCPManagerTool : null,
  ];

  return tools.filter((t): t is Tool => t !== null && t.isEnabled());
}

/**
 * Assemble the final tool pool
 *
 * Sort built-ins and MCP tools separately, then concatenate.
 * This preserves API server prompt cache breakpoints.
 */
export function assembleToolPool(
  baseTools: Tool[],
  mcpTools: Tool[],
  denyRules: string[]
): Tool[] {
  // Filter by deny rules
  const filteredBase = baseTools.filter((t) => !denyRules.includes(t.name));
  const filteredMcp = mcpTools.filter((t) => !denyRules.includes(t.name));

  // Sort each partition alphabetically
  const sortedBase = filteredBase.sort((a, b) => a.name.localeCompare(b.name));
  const sortedMcp = filteredMcp.sort((a, b) => a.name.localeCompare(b.name));

  // Concatenate: built-ins first, then MCP
  // This preserves cache breakpoints - adding/removing MCP tools
  // doesn't shift built-in tool positions
  return [...sortedBase, ...sortedMcp];
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private aliases: Map<string, string> = new Map();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  registerAlias(alias: string, target: string): void {
    this.aliases.set(alias, target);
  }

  lookup(name: string): Tool | undefined {
    // Direct lookup
    const direct = this.tools.get(name);
    if (direct) return direct;

    // Alias fallback (for renamed tools in old transcripts)
    const aliased = this.aliases.get(name);
    if (aliased) {
      return this.tools.get(aliased);
    }

    return undefined;
  }

  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Check if a tool call is safe for concurrent execution
   * based on the tool's input-dependent classification
   */
  isConcurrencySafe(toolCall: ToolCall): boolean {
    const tool = this.lookup(toolCall.name);
    if (!tool) return false; // Unknown tools are not safe

    try {
      // Parse input and check concurrency safety
      const parseResult = tool.inputSchema.safeParse(toolCall.input);
      if (!parseResult.success) return false; // Invalid input = not safe

      return tool.isConcurrencySafe(parseResult.data);
    } catch {
      // Fail-closed: any error means not safe
      return false;
    }
  }

  /**
   * Check if a tool call is read-only
   */
  isReadOnly(toolCall: ToolCall): boolean {
    const tool = this.lookup(toolCall.name);
    if (!tool) return false;

    try {
      const parseResult = tool.inputSchema.safeParse(toolCall.input);
      if (!parseResult.success) return false;

      return tool.isReadOnly(parseResult.data);
    } catch {
      return false;
    }
  }
}

// Global registry instance
export const toolRegistry = new ToolRegistry();
