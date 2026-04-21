/**
 * Skills System
 *
 * Two-phase skill loading with lifecycle hooks.
 */
export * from './types.js';
export * from './sources.js';
export * from './loader.js';
export * from './invoker.js';
import type { SkillsManager } from './types.js';
export interface SkillsInitOptions {
    projectDir?: string;
    additionalDirs?: string[];
    managedPath?: string;
}
/**
 * Initialize the skills system.
 * Returns a manager for invoking skills and registering hooks.
 */
export declare function initializeSkills(options?: SkillsInitOptions): Promise<SkillsManager>;
/**
 * Get system prompt with skills menu.
 */
export declare function getSkillsSystemPrompt(manager: SkillsManager): Promise<string>;
/**
 * List all available skills.
 */
export declare function listAvailableSkills(manager: SkillsManager): {
    name: string;
    description: string;
}[];
//# sourceMappingURL=index.d.ts.map