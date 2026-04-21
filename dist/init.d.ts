/**
 * Initialization Module
 *
 * Creates the singleton objects that persist for the session lifetime.
 */
import { ParsedArgs } from './args.js';
import { AppState, Message, ToolCall } from './state.js';
export { AppState, Message, ToolCall };
export interface AppContext {
    state: AppState;
    abortController: AbortController;
    workingDir: string;
    startTime: number;
    args: ParsedArgs;
}
/**
 * Initialize Singletons
 *
 * Creates the long-lived objects that persist for the entire session:
 * - AppState (reactive state store)
 * - AbortController (for cancellation)
 * - Working directory
 */
export declare function init(args: ParsedArgs): Promise<AppContext>;
//# sourceMappingURL=init.d.ts.map