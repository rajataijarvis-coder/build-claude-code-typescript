/**
 * Hooks System
 *
 * Lifecycle event interception with snapshot security.
 */
export * from './types.js';
export * from './snapshot.js';
export * from './executor.js';
import { captureHooksConfigSnapshot, shouldSkipHooksDueToTrust, setTrustState, getTrustState, } from './snapshot.js';
import { executeHooks, matchToolPattern } from './executor.js';
/**
 * Initialize the hooks system.
 * Captures frozen snapshot of all hook configurations.
 */
export function initializeHooks(configs, trustState = 'pending') {
    // Capture frozen snapshot at startup
    const snapshot = captureHooksConfigSnapshot(configs);
    // Set initial trust state
    setTrustState(trustState);
    console.log(`Initialized hooks system with ${configs.length} hooks`);
    return {
        snapshot,
        execute: executeHooks,
        matchTool: matchToolPattern,
    };
}
/**
 * Update trust state.
 */
export function acceptWorkspaceTrust() {
    setTrustState('accepted');
}
export function declineWorkspaceTrust() {
    setTrustState('declined');
}
/**
 * Check if hooks are currently active.
 */
export function areHooksActive() {
    return !shouldSkipHooksDueToTrust(getTrustState());
}
/**
 * Create a hook config from settings.
 */
export function createHookConfig(source, event, matcher, command) {
    return {
        source,
        event,
        matcher,
        definition: {
            type: 'command',
            command,
        },
    };
}
//# sourceMappingURL=index.js.map