/**
 * Hooks System Types
 *
 * Core type definitions for the hooks/lifecycle system.
 */

/**
 * All available hook lifecycle events.
 * Over two dozen distinct lifecycle points.
 */
export type HookEvent =
  // Tool lifecycle
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'PermissionDenied'
  | 'PermissionRequest'
  // Session lifecycle
  | 'SessionStart'
  | 'SessionEnd'
  | 'Setup'
  // Sub-agent lifecycle
  | 'SubagentStart'
  | 'SubagentStop'
  // Compaction events
  | 'PreCompact'
  | 'PostCompact'
  // User interaction
  | 'UserPromptSubmit'
  | 'Stop'
  // Configuration
  | 'ConfigChange'
  | 'InstructionsLoaded'
  | 'CwdChanged'
  | 'FileChanged'
  // Task management
  | 'TaskCreated'
  | 'TaskCompleted'
  | 'TeammateIdle'
  // Notifications
  | 'Notification'
  | 'Elicitation'
  | 'ElicitationResult';

/**
 * Hook source - determines priority and trust level.
 */
export type HookSource =
  | 'userSettings' // ~/.claude/settings.json, highest priority
  | 'projectSettings' // .claude/settings.json, version-controlled
  | 'localSettings' // .claude/settings.local.json, gitignored
  | 'policySettings' // Enterprise-managed, cannot be overridden
  | 'pluginHook' // From plugins (lowest priority)
  | 'sessionHook'; // Registered by skills, in-memory only

/**
 * Hook definition - what to run when event fires.
 */
export interface HookDefinition {
  type: 'command' | 'prompt' | 'agent' | 'http' | 'callback';
  command?: string; // Shell command for type: 'command'
  prompt?: string; // LLM prompt for type: 'prompt'
  url?: string; // HTTP endpoint for type: 'http'
  callback?: Function; // Direct function for type: 'callback'
  if?: string; // Condition for execution (e.g., "Bash(git commit*)")
  once?: boolean; // Remove after first execution
  id?: string; // Unique identifier
  env?: Record<string, string>; // Environment variables
}

/**
 * Hook configuration - bound to a specific event and source.
 */
export interface HookConfig {
  source: HookSource;
  event: HookEvent;
  matcher?: string; // Tool name or pattern (for tool-related events)
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
