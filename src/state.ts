/**
 * State Management
 * 
 * Implements the reactive state store for the application.
 */

/**
 * Represents a tool call from the assistant
 */
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Represents a message in the conversation
 */
export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;  // For tool messages
}

/**
 * Application state interface
 */
export interface AppState {
  messages: Message[];
  isLoading: boolean;
  currentTool?: string;
}

/**
 * Create reactive state store
 * 
 * Simple implementation - will expand with actual reactivity in later tutorials
 */
export function createState(): AppState {
  return {
    messages: [],
    isLoading: false,
  };
}

/**
 * Add a message to the conversation history
 */
export function addMessage(state: AppState, message: Message): void {
  state.messages.push(message);
}

/**
 * Get all messages in the conversation
 */
export function getMessages(state: AppState): readonly Message[] {
  return state.messages;
}

/**
 * Set loading state
 */
export function setLoading(state: AppState, loading: boolean): void {
  state.isLoading = loading;
}

/**
 * Set current tool being executed
 */
export function setCurrentTool(state: AppState, tool: string | undefined): void {
  state.currentTool = tool;
}
