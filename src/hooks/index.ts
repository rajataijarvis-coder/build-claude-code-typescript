/**
 * Hooks System
 *
 * Lifecycle event interception with snapshot security.
 */

export * from './types.js';
export * from './snapshot.js';
export * from './executor.js';

import {
  captureHooksConfigSnapshot,
  getHooksFromSnapshot,
  shouldSkipHooksDueToTrust,
  setTrustState,
  getTrustState,
} from './snapshot.js';
import { executeHooks, matchToolPattern } from './executor.js';
import type { HookConfig, HookEvent, HookResult } from './types.js';

export interface HooksManager {
  snapshot: ReturnType<typeof captureHooksConfigSnapshot>;
  execute: typeof executeHooks;
  matchTool: typeof matchToolPattern;
}

/**
 * Initialize the hooks system.
 * Captures frozen snapshot of all hook configurations.
 */
export function initializeHooks(
  configs: HookConfig[],
  trustState: 'pending' | 'accepted' | 'declined' = 'pending'
): HooksManager {
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
export function acceptWorkspaceTrust(): void {
  setTrustState('accepted');
}

export function declineWorkspaceTrust(): void {
  setTrustState('declined');
}

/**
 * Check if hooks are currently active.
 */
export function areHooksActive(): boolean {
  return !shouldSkipHooksDueToTrust(getTrustState());
}

/**
 * Create a hook config from settings.
 */
export function createHookConfig(
  source: HookConfig['source'],
  event: HookEvent,
  matcher: string | undefined,
  command: string
): HookConfig {
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
