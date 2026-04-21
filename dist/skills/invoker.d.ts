/**
 * Skills Invoker
 *
 * Phase 2: Load full skill content and prepare for injection.
 */
import type { LoadedSkill, SkillFrontmatter, SkillHookDefinition } from './types.js';
/**
 * Options for loading skill content.
 */
export interface LoadSkillContentOptions {
    arguments?: string[];
    sessionId?: string;
    projectDir?: string;
    timeoutMs?: number;
}
/**
 * Variable substitution for skill content.
 * Replaces placeholders with actual values.
 */
export declare function substituteVariables(content: string, variables: Record<string, string>): string;
/**
 * Extract and execute inline shell commands.
 * Commands are backtick-prefixed with !: `!command` or `!`command``
 */
export declare function executeInlineCommands(content: string, options: {
    cwd?: string;
    env?: Record<string, string>;
    timeoutMs?: number;
}): Promise<string>;
/**
 * Phase 2: Load full skill content and prepare for injection.
 */
export declare function loadSkillContent(skill: LoadedSkill, options: LoadSkillContentOptions): Promise<{
    content: string;
    hooks?: SkillFrontmatter['hooks'];
}>;
/**
 * Extract skill arguments from user input.
 * /skill-name arg1 arg2 "arg with spaces"
 */
export declare function parseSkillInvocation(input: string): {
    skillName: string;
    args: string[];
};
/**
 * Check if a hook should run based on its condition.
 */
export declare function shouldHookRun(hook: SkillHookDefinition, toolCall: {
    name: string;
    input?: unknown;
}): boolean;
//# sourceMappingURL=invoker.d.ts.map