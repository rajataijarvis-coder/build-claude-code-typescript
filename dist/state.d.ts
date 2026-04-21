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
    name?: string;
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
export declare function createState(): AppState;
/**
 * Add a message to the conversation history
 */
export declare function addMessage(state: AppState, message: Message): void;
/**
 * Get all messages in the conversation
 */
export declare function getMessages(state: AppState): readonly Message[];
/**
 * Set loading state
 */
export declare function setLoading(state: AppState, loading: boolean): void;
/**
 * Set current tool being executed
 */
export declare function setCurrentTool(state: AppState, tool: string | undefined): void;
//# sourceMappingURL=state.d.ts.map