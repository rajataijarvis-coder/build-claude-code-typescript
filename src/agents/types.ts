/**
 * Agent Types
 * 
 * Type definitions for the sub-agent system.
 */

import type { PermissionMode } from '../tools/types.js';

export { PermissionMode };

/**
 * Branded type for agent IDs
 */
export type AgentId = string & { __brand: 'AgentId' };

export function createAgentId(): AgentId {
  return `agent-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}` as AgentId;
}

/**
 * Agent definition - describes a specialized agent
 */
export interface AgentDefinition {
  /** Unique identifier */
  agentType: string;
  
  /** Display name */
  name: string;
  
  /** When to use this agent */
  description: string;
  
  /** Model preference */
  model: 'sonnet' | 'opus' | 'haiku' | 'inherit';
  
  /** Default permission mode */
  permissionMode: PermissionMode;
  
  /** Available tools */
  tools: string[] | '*';
  
  /** Blocked tools */
  disallowedTools?: string[];
  
  /** Maximum conversation turns */
  maxTurns?: number;
  
  /** Whether agent always runs async */
  background?: boolean;
  
  /** Whether to omit CLAUDE.md context */
  omitClaudeMd?: boolean;
  
  /** Preloaded skills */
  skills?: string[];
  
  /** MCP servers to initialize */
  mcpServers?: string[];
  
  /** Lifecycle hooks */
  hooks?: AgentHooks;
  
  /** Terminal color for display */
  color?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';
  
  /** Effort level (cost control) */
  effort?: 'low' | 'medium' | 'high';
  
  /** Generate system prompt */
  getSystemPrompt: (context: AgentContext) => string | Promise<string>;
}

/**
 * Context for system prompt generation
 */
export interface AgentContext {
  toolUseContext: any;
  agentType: string;
  prompt: string;
}

/**
 * Agent lifecycle hooks
 */
export interface AgentHooks {
  PreToolUse?: HookDefinition[];
  PostToolUse?: HookDefinition[];
  Stop?: HookDefinition[];
}

export interface HookDefinition {
  command: string;
  event: string;
  args?: string[];
}

/**
 * Source of agent definition
 */
export type AgentSource = 
  | 'builtin'    // Hardcoded in Claude Code
  | 'user'       // From .claude/agents/
  | 'plugin'     // From loaded plugin
  | 'policy';    // From organizational policy

/**
 * Agent tool input
 */
export interface AgentInput {
  description: string;
  prompt: string;
  subagent_type?: string;
  model?: 'sonnet' | 'opus' | 'haiku';
  run_in_background?: boolean;
  name?: string;
  team_name?: string;
  mode?: PermissionMode;
  isolation?: 'worktree' | 'remote';
  cwd?: string;
}

/**
 * Agent tool output variants
 */
export type AgentOutput =
  | { status: 'completed'; result: string; agentId: string; model: string; turns: number }
  | { status: 'async_launched'; agentId: string; description: string; outputFile: string }
  | { status: 'teammate_spawned'; agentId: string; name: string; teamName: string };

/**
 * Agent execution result
 */
export interface AgentResult {
  content: string;
  model: string;
  turns: number;
  success: boolean;
}
