/**
 * Skills System
 *
 * Two-phase skill loading with lifecycle hooks.
 */
export * from './types.js';
export * from './sources.js';
export * from './loader.js';
export * from './invoker.js';
import { scanSkills, formatSkillsForSystemPrompt } from './loader.js';
import { resolveSkillSources } from './sources.js';
import { loadSkillContent } from './invoker.js';
import { registerSkillHooks } from './hook-registration.js';
/**
 * Initialize the skills system.
 * Returns a manager for invoking skills and registering hooks.
 */
export async function initializeSkills(options = {}) {
    // Phase 1: Scan all sources and extract frontmatter
    const sources = await resolveSkillSources(options);
    const index = await scanSkills(sources);
    console.log(`Loaded ${index.skills.size} skills from ${sources.length} sources`);
    const manager = {
        index,
        sessionHooks: [],
        async invokeSkill(name, args) {
            const skill = index.skills.get(name.toLowerCase());
            if (!skill) {
                throw new Error(`Skill not found: ${name}`);
            }
            // Check if model is allowed to invoke
            if (skill.frontmatter.disable_model_invocation) {
                throw new Error(`Skill ${name} cannot be invoked by the model`);
            }
            // Phase 2: Load full content
            const { content, hooks } = await loadSkillContent(skill, {
                arguments: args,
                sessionId: generateSessionId(),
                projectDir: options.projectDir,
            });
            // Register skill-declared hooks
            let registeredHooks = [];
            if (hooks) {
                registeredHooks = registerSkillHooks(skill, hooks);
                manager.sessionHooks.push(...registeredHooks);
            }
            return { content, registeredHooks };
        },
    };
    return manager;
}
/**
 * Generate a unique session ID.
 */
function generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
/**
 * Get system prompt with skills menu.
 */
export async function getSkillsSystemPrompt(manager) {
    return formatSkillsForSystemPrompt(manager.index);
}
/**
 * List all available skills.
 */
export function listAvailableSkills(manager) {
    return Array.from(manager.index.skills.values()).map((skill) => ({
        name: skill.name,
        description: skill.frontmatter.description,
    }));
}
//# sourceMappingURL=index.js.map