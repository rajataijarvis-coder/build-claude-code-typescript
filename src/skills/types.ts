/**
 * Skills System Types
 *
 * Type definitions for the skills and hooks system.
 */

/**
 * Skill frontmatter extracted at startup (cheap).
 * Full content loaded only on invocation (expensive).
 */
export interface SkillFrontmatter {
  // Required: user-facing display name
  name: string;

  // Required: shown in autocomplete and system prompt
  description: string;

  // Optional: detailed usage scenarios
  when_to_use?: string;

  // Optional: which tools this skill can use
  allowed_tools?: string[];

  // Optional: block autonomous model use
  disable_model_invocation?: boolean;

  // Optional: 'fork' to run as sub-agent (isolated context)
  context?: 'fork' | 'inline';

  // Optional: lifecycle hooks registered on invocation
  hooks?: SkillHooksConfig;

  // Optional: glob patterns for conditional activation
  paths?: string[];

  // Optional: additional metadata
  tags?: string[];
}

/**
 * Hooks declared in skill frontmatter.
 * Registered as session-scoped hooks when skill is invoked.
 */
export interface SkillHooksConfig {
  PreToolUse?: SkillHookMatcherConfig[];
  PostToolUse?: SkillHookMatcherConfig[];
  Stop?: SkillHookMatcherConfig[];
  SessionStart?: SkillHookMatcherConfig[];
  // ... and 20+ more lifecycle events
}

export interface SkillHookMatcherConfig {
  matcher: string; // Tool name or pattern, e.g., "Bash" or "Bash(git *)"
  hooks: SkillHookDefinition[];
}

export interface SkillHookDefinition {
  type: 'command' | 'prompt' | 'agent' | 'http' | 'callback';
  command?: string; // Shell command for type: 'command'
  prompt?: string; // LLM prompt for type: 'prompt'
  url?: string; // HTTP endpoint for type: 'http'
  if?: string; // Condition for execution (e.g., "Bash(git commit*)")
  once?: boolean; // Remove after first execution
  id?: string; // Unique identifier
  env?: Record<string, string>; // Environment variables
}

/**
 * Skill source with precedence information.
 */
export interface SkillSource {
  priority: number;
  name: string;
  path: string;
  trustLevel: 'managed' | 'user' | 'project' | 'mcp';
}

/**
 * Loaded skill with lazy content loader.
 */
export interface LoadedSkill {
  name: string;
  frontmatter: SkillFrontmatter;
  source: SkillSource;
  filePath: string;
  // Full content NOT loaded yet - stored as closure
  loadContent: () => Promise<string>;
}

/**
 * Skill index containing all scanned skills.
 */
export interface SkillIndex {
  skills: Map<string, LoadedSkill>;
  sources: SkillSource[];
}

/**
 * Hook event types (subset - full list in hooks/types.ts)
 */
export type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'PermissionDenied'
  | 'PermissionRequest'
  | 'SessionStart'
  | 'SessionEnd'
  | 'Setup'
  | 'SubagentStart'
  | 'SubagentStop'
  | 'PreCompact'
  | 'PostCompact'
  | 'UserPromptSubmit'
  | 'Stop'
  | 'ConfigChange'
  | 'InstructionsLoaded'
  | 'CwdChanged'
  | 'FileChanged'
  | 'TaskCreated'
  | 'TaskCompleted'
  | 'TeammateIdle'
  | 'Notification'
  | 'Elicitation'
  | 'ElicitationResult';

/**
 * Result from a hook execution.
 */
export interface HookResult {
  // Exit code semantics:
  // 0 = success, continue normally
  // 2 = blocking error (stderr shown to model)
  // other = non-blocking warning (shown to user)
  exitCode: number;

  // Optional: stdout parsed if JSON
  stdout?: string;

  // Optional: stderr shown to model (if blocking) or user (if warning)
  stderr?: string;

  // Optional: modify tool input (PreToolUse only)
  updatedInput?: unknown;

  // Optional: force specific permission behavior
  permissionBehavior?: 'allow' | 'deny' | 'ask';

  // Optional: additional context to inject
  additionalContext?: string;

  // Internal: was execution blocked?
  blocked?: boolean;
}

/**
 * Source of a hook configuration.
 */
export type SkillHookSource =
  | 'userSettings'
  | 'projectSettings'
  | 'localSettings'
  | 'policySettings'
  | 'pluginHook'
  | 'sessionHook'
  | 'managed';

/**
 * Hook configuration.
 */
export interface HookConfig {
  source: SkillHookSource;
  event: HookEvent;
  matcher?: string; // Tool name or pattern
  definition: SkillHookDefinition;
}

/**
 * Policy configuration for hook enforcement.
 */
export interface PolicyConfig {
  disableAllHooks?: boolean;
  allowManagedHooksOnly?: boolean;
}

/**
 * Skills manager interface.
 */
export interface SkillsManager {
  index: SkillIndex;
  sessionHooks: HookConfig[];
  invokeSkill(
    name: string,
    args?: string[]
  ): Promise<{
    content: string;
    registeredHooks: HookConfig[];
  }>;
}
