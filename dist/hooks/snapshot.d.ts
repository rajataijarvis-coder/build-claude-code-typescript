/**
 * Hooks Snapshot
 *
 * Security-critical: hooks frozen at startup, never re-read implicitly.
 */
import type { HooksSnapshot, HookConfig, HookEvent, PolicyConfig } from './types.js';
/**
 * Capture hooks configuration at startup.
 * Called once during initialization.
 *
 * SECURITY: This creates a frozen snapshot that is never
 * implicitly re-read. File system changes after this point
 * are ignored until explicit update is triggered.
 */
export declare function captureHooksConfigSnapshot(configs: HookConfig[]): HooksSnapshot;
/**
 * Get hooks for a specific event from the frozen snapshot.
 *
 * SECURITY: Always reads from snapshot, never from filesystem.
 */
export declare function getHooksFromSnapshot(event: HookEvent): HookConfig[];
/**
 * Get the active snapshot metadata.
 */
export declare function getSnapshotMetadata(): {
    capturedAt: Date;
    version: number;
} | null;
/**
 * Explicitly update snapshot (e.g., via /hooks command or file watcher).
 *
 * SECURITY: This is explicit, not implicit. The user must take
 * action to refresh hooks after they trust the workspace.
 */
export declare function updateHooksConfigSnapshot(newConfigs: HookConfig[]): HooksSnapshot;
/**
 * Check if we should skip hooks due to trust state.
 *
 * SECURITY: Prevents hooks from firing before user accepts
 * workspace trust or after they decline it.
 */
export declare function shouldSkipHooksDueToTrust(state: 'pending' | 'accepted' | 'declined'): boolean;
/**
 * Set the trust state.
 */
export declare function setTrustState(state: 'pending' | 'accepted' | 'declined'): void;
/**
 * Get the current trust state.
 */
export declare function getTrustState(): 'pending' | 'accepted' | 'declined';
/**
 * Set policy configuration.
 */
export declare function setPolicyConfig(config: PolicyConfig): void;
/**
 * Get policy configuration.
 */
export declare function getPolicyConfig(): PolicyConfig;
/**
 * Check if a hook is allowed by policy.
 */
export declare function isHookAllowed(config: HookConfig): boolean;
/**
 * Get all hooks from snapshot (for debugging).
 */
export declare function getAllHooksFromSnapshot(): HookConfig[];
/**
 * Clear the snapshot (for testing).
 */
export declare function clearSnapshot(): void;
//# sourceMappingURL=snapshot.d.ts.map