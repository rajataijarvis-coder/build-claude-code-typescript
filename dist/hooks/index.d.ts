/**
 * Hooks System
 *
 * Lifecycle event interception with snapshot security.
 */
export * from './types.js';
export * from './snapshot.js';
export * from './executor.js';
import { captureHooksConfigSnapshot } from './snapshot.js';
import { executeHooks, matchToolPattern } from './executor.js';
import type { HookConfig, HookEvent } from './types.js';
export interface HooksManager {
    snapshot: ReturnType<typeof captureHooksConfigSnapshot>;
    execute: typeof executeHooks;
    matchTool: typeof matchToolPattern;
}
/**
 * Initialize the hooks system.
 * Captures frozen snapshot of all hook configurations.
 */
export declare function initializeHooks(configs: HookConfig[], trustState?: 'pending' | 'accepted' | 'declined'): HooksManager;
/**
 * Update trust state.
 */
export declare function acceptWorkspaceTrust(): void;
export declare function declineWorkspaceTrust(): void;
/**
 * Check if hooks are currently active.
 */
export declare function areHooksActive(): boolean;
/**
 * Create a hook config from settings.
 */
export declare function createHookConfig(source: HookConfig['source'], event: HookEvent, matcher: string | undefined, command: string): HookConfig;
//# sourceMappingURL=index.d.ts.map