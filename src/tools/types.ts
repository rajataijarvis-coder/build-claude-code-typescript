/**
 * Tool System Types
 * 
 * Core type definitions for the tool execution system.
 */

import { z } from 'zod';

/**
 * Tool interface with three type parameters:
 * - Input: Zod schema for validation and JSON Schema generation
 * - Output: TypeScript return type
 * - Progress: Progress events emitted during execution
 */
export interface Tool<
  Input extends z.ZodTypeAny = z.ZodTypeAny,
  Output = unknown,
  Progress = unknown
> {
  // Core identification
  name: string;
  description: string;
  
  // Schema for validation and API JSON Schema generation
  inputSchema: Input;
  
  // Main execution function
  call(input: z.infer<Input>, context: ToolUseContext): Promise<ToolResult<Output>>;
  
  // Concurrency classification - INPUT DEPENDENT
  isConcurrencySafe(input: z.infer<Input>): boolean;
  
  // Read/write classification - INPUT DEPENDENT  
  isReadOnly(input: z.infer<Input>): boolean;
  
  // Permission check - runs AFTER general permission system
  checkPermissions(
    input: z.infer<Input>,
    context: ToolUseContext
  ): PermissionCheckResult;
  
  // Semantic validation beyond schema
  validateInput?(input: z.infer<Input>): ValidationResult;
  
  // Result size limit for budgeting
  maxResultSizeChars: number;
  
  // Feature flag gating
  isEnabled(): boolean;
  
  // Deferred loading for MCP tools
  shouldDefer?: boolean;
  
  /**
   * Interrupt behavior for this tool
   * 'cancel' - Safe to interrupt (reads, searches)
   * 'block' - Must complete (writes, long-running commands)
   */
  interruptBehavior?(input: z.infer<Input>): 'cancel' | 'block';
}

export interface ToolResult<T> {
  data: T;
  // Additional messages to inject (sub-agent transcripts, reminders)
  newMessages?: Message[];
  // Function to modify context for subsequent tools
  contextModifier?: (context: ToolUseContext) => ToolUseContext;
}

export interface Message {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolUseContext {
  // Configuration (mostly immutable)
  options: {
    toolSet: Tool[];
    model: string;
    debug: boolean;
  };
  
  // Execution state
  abortController: AbortController;
  readFileState: Map<string, FileState>;  // LRU file cache
  messages: Message[];  // Full conversation history
  workingDirectory: string;
  
  // Permission state
  permissionMode: PermissionMode;
  alwaysAllowRules: PermissionRule[];
  alwaysDenyRules: PermissionRule[];
  alwaysAskRules: PermissionRule[];
  
  // UI callbacks (undefined in headless mode)
  requestPrompt?: (request: PromptRequest) => Promise<string>;
  
  // Agent context
  agentId?: string;
  renderedSystemPrompt?: string;  // Frozen for cache stability
  parentContext?: ToolUseContext;  // For sub-agents
}

export interface FileState {
  content: string;
  mtime: Date;
  size: number;
}

export type PermissionMode =
  | 'default'
  | 'acceptEdits'
  | 'plan'
  | 'dontAsk'
  | 'bypassPermissions'
  | 'auto'
  | 'bubble';

export interface PermissionRule {
  source: 'userSettings' | 'projectSettings' | 'localSettings' | 'cliArg' | 'policySettings' | 'session';
  behavior: 'allow' | 'deny' | 'ask';
  toolName: string;
  contentPattern?: string;  // e.g., "Bash(git *)" for git commands
}

export interface PermissionCheckResult {
  behavior: 'allow' | 'deny' | 'ask' | 'passthrough';
  updatedInput?: unknown;
  reason?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface PromptRequest {
  tool: string;
  input: unknown;
  message: string;
}

export interface ErrorClassification {
  category: string;
  type: string;
  safeMessage: string;
  errno?: string;
  telemetrySafe: boolean;
}

/**
 * Tool use block from API response (for streaming executor)
 */
export interface ToolUseBlock {
  id: string;
  name: string;
  input: Record<string, unknown>;
}
