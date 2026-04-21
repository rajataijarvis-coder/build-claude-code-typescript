/**
 * Initialization Module
 *
 * Creates the singleton objects that persist for the session lifetime.
 */
import { createState } from './state.js';
/**
 * Initialize Singletons
 *
 * Creates the long-lived objects that persist for the entire session:
 * - AppState (reactive state store)
 * - AbortController (for cancellation)
 * - Working directory
 */
export async function init(args) {
    console.log('  📦 Initializing state...');
    // Create reactive state store
    const state = createState();
    // Create abort controller for cancellation support
    const abortController = createAbortController();
    // Determine working directory
    const workingDir = args.cwd || process.cwd();
    process.chdir(workingDir);
    console.log(`  📁 Working directory: ${workingDir}`);
    return {
        state,
        abortController,
        workingDir,
        startTime: Date.now(),
        args,
    };
}
/**
 * Creates an abort controller with proper cleanup handling.
 */
function createAbortController() {
    const controller = new AbortController();
    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
        console.log('\n\n⚠️ Interrupted by user');
        controller.abort('user_interrupt');
        process.exit(0);
    });
    return controller;
}
//# sourceMappingURL=init.js.map