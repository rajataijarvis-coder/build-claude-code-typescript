/**
 * Setup Module
 *
 * Performs one-time initialization of the ~/.claude/ directory.
 */
import { AppContext } from './init.js';
/**
 * One-Time Setup
 *
 * Creates the ~/.claude/ directory structure if it doesn't exist.
 * This runs once per machine, not once per session.
 */
export declare function setup(context: AppContext): Promise<void>;
//# sourceMappingURL=setup.d.ts.map