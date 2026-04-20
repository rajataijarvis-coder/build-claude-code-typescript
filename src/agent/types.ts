/**
 * Agent Loop Types
 * 
 * Core type definitions for the agent loop.
 */

export interface Message {
  role: 'user' | 'assistant' | 'tool';
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

export interface ToolResult {
  tool_call_id: string;
  content: string;
  isError?: boolean;
}

// Why the loop stopped
export type TerminalReason =
  | { reason: 'completed'; message: string }
  | { reason: 'aborted'; message: string }
  | { reason: 'max_turns_reached' }
  | { reason: 'error'; error: string };

// Events yielded during execution
export type LoopEvent =
  | { type: 'assistant_message'; content: string }
  | { type: 'tool_call'; tool: ToolCall }
  | { type: 'tool_result'; result: ToolResult }
  | { type: 'thinking'; content: string };

export interface LoopParams {
  messages: Message[];
  systemPrompt?: string;
  maxTurns?: number;
  apiKey: string;
  model?: string;
}

// State carried through the loop
export interface LoopState {
  messages: Message[];
  turnCount: number;
  maxTurns: number;
}
