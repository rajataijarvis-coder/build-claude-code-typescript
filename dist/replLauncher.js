/**
 * REPL Launcher
 *
 * Starts the interactive Read-Eval-Print Loop.
 */
import { createInterface } from 'readline';
import { queryLoop } from './queryLoop.js';
/**
 * Launch Interactive REPL
 *
 * Starts the chat interface where users type messages and Claude responds.
 */
export async function launchRepl(context) {
    const startupTime = Date.now() - context.startTime;
    console.log(`\n🤖 Claude Code ready! (startup: ${startupTime}ms)`);
    console.log('Type your message or "exit" to quit.\n');
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'You: ',
    });
    // Welcome message
    console.log('Assistant: Hello! I\'m Claude Code. How can I help you today?\n');
    // Main interaction loop
    while (true) {
        const userInput = await new Promise((resolve) => {
            rl.question('You: ', resolve);
        });
        if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
            console.log('\nGoodbye! 👋');
            rl.close();
            break;
        }
        if (userInput.trim() === '')
            continue;
        // Run the query loop (will implement in Tutorial 5)
        await queryLoop(userInput, context);
    }
}
//# sourceMappingURL=replLauncher.js.map