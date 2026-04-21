/**
 * Skill Hook Registration
 *
 * Convert skill-declared hooks to session-scoped hook configs.
 */
/**
 * Convert skill-declared hooks to session-scoped hook configs.
 * Called when skill is invoked.
 */
export function registerSkillHooks(skill, hooksConfig) {
    const configs = [];
    for (const [event, matchers] of Object.entries(hooksConfig)) {
        if (!matchers)
            continue;
        for (const matcherConfig of matchers) {
            for (const hookDef of matcherConfig.hooks) {
                configs.push({
                    source: 'sessionHook',
                    event: event,
                    matcher: matcherConfig.matcher,
                    definition: {
                        ...hookDef,
                        // Prepend skill root to relative command paths
                        command: hookDef.command?.startsWith('/')
                            ? hookDef.command
                            : `${skill.source.path}/${hookDef.command}`,
                        // Set CLAUDE_PLUGIN_ROOT for shell commands
                        env: {
                            ...hookDef.env,
                            CLAUDE_PLUGIN_ROOT: skill.source.path,
                        },
                    },
                });
            }
        }
    }
    return configs;
}
/**
 * Remove session hooks after execution (if once: true).
 */
export function removeSessionHook(hookId, sessionHooks) {
    return sessionHooks.filter((h) => h.definition.id !== hookId);
}
/**
 * Convert Stop hooks to SubagentStop for fork agents.
 * Subagents trigger SubagentStop, not Stop.
 */
export function convertHooksForSubagent(hooks) {
    return hooks.map((hook) => {
        if (hook.event === 'Stop') {
            return { ...hook, event: 'SubagentStop' };
        }
        return hook;
    });
}
/**
 * Check if a skill has any hooks declared.
 */
export function skillHasHooks(frontmatter) {
    if (!frontmatter.hooks)
        return false;
    return Object.keys(frontmatter.hooks).length > 0;
}
/**
 * Count hooks in a skill's hook configuration.
 */
export function countSkillHooks(hooksConfig) {
    let count = 0;
    for (const matchers of Object.values(hooksConfig)) {
        if (!matchers)
            continue;
        for (const matcher of matchers) {
            count += matcher.hooks.length;
        }
    }
    return count;
}
//# sourceMappingURL=hook-registration.js.map