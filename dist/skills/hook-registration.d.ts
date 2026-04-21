/**
 * Skill Hook Registration
 *
 * Convert skill-declared hooks to session-scoped hook configs.
 */
import type { LoadedSkill, SkillHooksConfig, SkillFrontmatter } from './types.js';
import type { HookConfig } from '../hooks/types.js';
/**
 * Convert skill-declared hooks to session-scoped hook configs.
 * Called when skill is invoked.
 */
export declare function registerSkillHooks(skill: LoadedSkill, hooksConfig: SkillHooksConfig): HookConfig[];
/**
 * Remove session hooks after execution (if once: true).
 */
export declare function removeSessionHook(hookId: string, sessionHooks: HookConfig[]): HookConfig[];
/**
 * Convert Stop hooks to SubagentStop for fork agents.
 * Subagents trigger SubagentStop, not Stop.
 */
export declare function convertHooksForSubagent(hooks: HookConfig[]): HookConfig[];
/**
 * Check if a skill has any hooks declared.
 */
export declare function skillHasHooks(frontmatter: SkillFrontmatter): boolean;
/**
 * Count hooks in a skill's hook configuration.
 */
export declare function countSkillHooks(hooksConfig: SkillHooksConfig): number;
//# sourceMappingURL=hook-registration.d.ts.map