/**
 * Query Loop
 *
 * The core conversation loop that processes user input and generates responses.
 * This is a simplified version - the full implementation comes in Tutorial 5.
 */
import { addMessage } from './state.js';
/**
 * Query Loop - Stub for Tutorial 5
 */
export async function queryLoop(userInput, context) {
    // Store the user message
    const userMessage = {
        role: 'user',
        content: userInput,
    };
    addMessage(context.state, userMessage);
    // For now, just echo back a placeholder response
    console.log('Assistant: I received your message. The full query loop with LLM integration will be implemented in Tutorial 5.');
    console.log(`         Message count: ${context.state.messages.length}`);
    console.log(`         You said: "${userInput}"\n`);
    // Store the assistant response
    const assistantMessage = {
        role: 'assistant',
        content: 'Placeholder response - LLM integration coming in Tutorial 5',
    };
    addMessage(context.state, assistantMessage);
}
//# sourceMappingURL=queryLoop.js.map