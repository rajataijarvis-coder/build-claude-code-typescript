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
    name: string;
    description: string;
    when_to_use?: string;
    allowed_tools?: string[];
    disable_model_invocation?: boolean;
    context?: 'fork' | 'inline';
    hooks?: SkillHooksConfig;
    paths?: string[];
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
}
export interface SkillHookMatcherConfig {
    matcher: string;
    hooks: SkillHookDefinition[];
}
export interface SkillHookDefinition {
    type: 'command' | 'prompt' | 'agent' | 'http' | 'callback';
    command?: string;
    prompt?: string;
    url?: string;
    if?: string;
    once?: boolean;
    id?: string;
    env?: Record<string, string>;
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
export type HookEvent = 'PreToolUse' | 'PostToolUse' | 'PostToolUseFailure' | 'PermissionDenied' | 'PermissionRequest' | 'SessionStart' | 'SessionEnd' | 'Setup' | 'SubagentStart' | 'SubagentStop' | 'PreCompact' | 'PostCompact' | 'UserPromptSubmit' | 'Stop' | 'ConfigChange' | 'InstructionsLoaded' | 'CwdChanged' | 'FileChanged' | 'TaskCreated' | 'TaskCompleted' | 'TeammateIdle' | 'Notification' | 'Elicitation' | 'ElicitationResult';
/**
 * Result from a hook execution.
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
 * Source of a hook configuration.
 */
export type SkillHookSource = 'userSettings' | 'projectSettings' | 'localSettings' | 'policySettings' | 'pluginHook' | 'sessionHook' | 'managed';
/**
 * Hook configuration.
 */
export interface HookConfig {
    source: SkillHookSource;
    event: HookEvent;
    matcher?: string;
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
    invokeSkill(name: string, args?: string[]): Promise<{
        content: string;
        registeredHooks: HookConfig[];
    }>;
}
//# sourceMappingURL=types.d.ts.map