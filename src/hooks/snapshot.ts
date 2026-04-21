/**
 * Hooks Snapshot
 *
 * Security-critical: hooks frozen at startup, never re-read implicitly.
 */

import type {
  HooksSnapshot,
  HookConfig,
  HookEvent,
  PolicyConfig,
} from './types.js';

// Active snapshot - frozen at startup
let activeSnapshot: HooksSnapshot | null = null;

// User trust state
let trustState: 'pending' | 'accepted' | 'declined' = 'pending';

// Policy configuration
let policyConfig: PolicyConfig = {};

/**
 * Capture hooks configuration at startup.
 * Called once during initialization.
 *
 * SECURITY: This creates a frozen snapshot that is never
 * implicitly re-read. File system changes after this point
 * are ignored until explicit update is triggered.
 */
export function captureHooksConfigSnapshot(
  configs: HookConfig[]
): HooksSnapshot {
  const byEvent = new Map<HookEvent, HookConfig[]>();

  for (const config of configs) {
    const existing = byEvent.get(config.event) || [];
    existing.push(config);
    byEvent.set(config.event, existing);
  }

  activeSnapshot = {
    capturedAt: new Date(),
    configs: byEvent,
    version: Date.now(),
  };

  return activeSnapshot;
}

/**
 * Get hooks for a specific event from the frozen snapshot.
 *
 * SECURITY: Always reads from snapshot, never from filesystem.
 */
export function getHooksFromSnapshot(event: HookEvent): HookConfig[] {
  if (!activeSnapshot) {
    throw new Error(
      'Hooks snapshot not captured. Call captureHooksConfigSnapshot() first.'
    );
  }

  const hooks = activeSnapshot.configs.get(event) || [];

  // Apply policy filtering
  return hooks.filter((hook) => {
    if (policyConfig.disableAllHooks) return false;
    if (policyConfig.allowManagedHooksOnly) {
      return hook.source === 'policySettings';
    }
    return true;
  });
}

/**
 * Get the active snapshot metadata.
 */
export function getSnapshotMetadata():
  | { capturedAt: Date; version: number }
  | null {
  if (!activeSnapshot) return null;
  return {
    capturedAt: activeSnapshot.capturedAt,
    version: activeSnapshot.version,
  };
}

/**
 * Explicitly update snapshot (e.g., via /hooks command or file watcher).
 *
 * SECURITY: This is explicit, not implicit. The user must take
 * action to refresh hooks after they trust the workspace.
 */
export function updateHooksConfigSnapshot(
  newConfigs: HookConfig[]
): HooksSnapshot {
  // Increment version and recapture
  return captureHooksConfigSnapshot(newConfigs);
}

/**
 * Check if we should skip hooks due to trust state.
 *
 * SECURITY: Prevents hooks from firing before user accepts
 * workspace trust or after they decline it.
 */
export function shouldSkipHooksDueToTrust(
  state: 'pending' | 'accepted' | 'declined'
): boolean {
  return state !== 'accepted';
}

/**
 * Set the trust state.
 */
export function setTrustState(
  state: 'pending' | 'accepted' | 'declined'
): void {
  trustState = state;
}

/**
 * Get the current trust state.
 */
export function getTrustState(): 'pending' | 'accepted' | 'declined' {
  return trustState;
}

/**
 * Set policy configuration.
 */
export function setPolicyConfig(config: PolicyConfig): void {
  policyConfig = config;
}

/**
 * Get policy configuration.
 */
export function getPolicyConfig(): PolicyConfig {
  return { ...policyConfig };
}

/**
 * Check if a hook is allowed by policy.
 */
export function isHookAllowed(config: HookConfig): boolean {
  if (policyConfig.disableAllHooks) return false;
  if (
    policyConfig.allowManagedHooksOnly &&
    config.source !== 'policySettings'
  ) {
    return false;
  }
  return true;
}

/**
 * Get all hooks from snapshot (for debugging).
 */
export function getAllHooksFromSnapshot(): HookConfig[] {
  if (!activeSnapshot) {
    throw new Error('Hooks snapshot not captured');
  }

  const allHooks: HookConfig[] = [];
  for (const hooks of activeSnapshot.configs.values()) {
    allHooks.push(...hooks);
  }
  return allHooks;
}

/**
 * Clear the snapshot (for testing).
 */
export function clearSnapshot(): void {
  activeSnapshot = null;
  trustState = 'pending';
  policyConfig = {};
}
