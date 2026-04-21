/**
 * State Management
 *
 * Implements the reactive state store for the application.
 */
/**
 * Create reactive state store
 *
 * Simple implementation - will expand with actual reactivity in later tutorials
 */
export function createState() {
    return {
        messages: [],
        isLoading: false,
    };
}
/**
 * Add a message to the conversation history
 */
export function addMessage(state, message) {
    state.messages.push(message);
}
/**
 * Get all messages in the conversation
 */
export function getMessages(state) {
    return state.messages;
}
/**
 * Set loading state
 */
export function setLoading(state, loading) {
    state.isLoading = loading;
}
/**
 * Set current tool being executed
 */
export function setCurrentTool(state, tool) {
    state.currentTool = tool;
}
//# sourceMappingURL=state.js.map