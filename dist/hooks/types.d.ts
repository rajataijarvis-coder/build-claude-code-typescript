/**
 * Hooks System Types
 *
 * Core type definitions for the hooks/lifecycle system.
 */
/**
 * All available hook lifecycle events.
 * Over two dozen distinct lifecycle points.
 */
export type HookEvent = 'PreToolUse' | 'PostToolUse' | 'PostToolUseFailure' | 'PermissionDenied' | 'PermissionRequest' | 'SessionStart' | 'SessionEnd' | 'Setup' | 'SubagentStart' | 'SubagentStop' | 'PreCompact' | 'PostCompact' | 'UserPromptSubmit' | 'Stop' | 'ConfigChange' | 'InstructionsLoaded' | 'CwdChanged' | 'FileChanged' | 'TaskCreated' | 'TaskCompleted' | 'TeammateIdle' | 'Notification' | 'Elicitation' | 'ElicitationResult';
/**
 * Hook source - determines priority and trust level.
 */
export type HookSource = 'userSettings' | 'projectSettings' | 'localSettings' | 'policySettings' | 'pluginHook' | 'sessionHook';
/**
 * Hook definition - what to run when event fires.
 */
export interface HookDefinition {
    type: 'command' | 'prompt' | 'agent' | 'http' | 'callback';
    command?: string;
    prompt?: string;
    url?: string;
    callback?: Function;
    if?: string;
    once?: boolean;
    id?: string;
    env?: Record<string, string>;
}
/**
 * Hook configuration - bound to a specific event and source.
 */
export interface HookConfig {
    source: HookSource;
    event: HookEvent;
    matcher?: string;
    definition: HookDefinition;
}
/**
 * Result from a hook execution.
 *
 * Exit code semantics:
 * - 0: Success, continue normally
 * - 2: Blocking error, stderr shown to model
 * - Other: Non-blocking warning, shown to user
 */
export interface HookResult {
    exitCode: number;
    stdout?: string;
    stderr?: string;
    updatedInput?: unknown;
    permissionBehavior?: 'allow' | 'deny' | 'ask';
    additionalContext?: string;
    blocked?: boolean;
}
/**
 * Options for executing hooks.
 */
export interface ExecuteHooksOptions {
    event: HookEvent;
    input: unknown;
    toolName?: string;
    trustState: 'pending' | 'accepted' | 'declined';
    abortSignal?: AbortSignal;
}
/**
 * Policy configuration for hook enforcement.
 */
export interface PolicyConfig {
    disableAllHooks?: boolean;
    allowManagedHooksOnly?: boolean;
}
/**
 * Frozen snapshot of hook configuration.
 */
export interface HooksSnapshot {
    capturedAt: Date;
    configs: Map<HookEvent, HookConfig[]>;
    version: number;
}
/**
 * Aggregated hook execution result.
 */
export interface AggregatedHookResult extends HookResult {
    executedHooks: number;
    matchedHooks: number;
}
//# sourceMappingURL=types.d.ts.map