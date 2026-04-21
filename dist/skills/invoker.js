/**
 * Skills Invoker
 *
 * Phase 2: Load full skill content and prepare for injection.
 */
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
/**
 * Variable substitution for skill content.
 * Replaces placeholders with actual values.
 */
export function substituteVariables(content, variables) {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
        // Support both $VAR and ${VAR} syntax
        const pattern = new RegExp(`\\$\\{?${key}\\}?`, 'g');
        result = result.replace(pattern, value);
    }
    return result;
}
/**
 * Extract and execute inline shell commands.
 * Commands are backtick-prefixed with !: `!command` or `!`command``
 */
export async function executeInlineCommands(content, options) {
    // Match `!command` or `!`command`` patterns
    const commandRegex = /!`([^`]+)`|`!([^`]+)`/g;
    let result = content;
    let match;
    while ((match = commandRegex.exec(content)) !== null) {
        const command = match[1] || match[2];
        try {
            const { stdout } = await execAsync(command, {
                cwd: options.cwd,
                env: { ...process.env, ...options.env },
                timeout: options.timeoutMs || 30000,
            });
            // Replace command with output
            result = result.replace(match[0], stdout.trim());
        }
        catch (error) {
            // Command failed - replace with error message
            const errorMsg = `<!-- Command failed: ${command} - ${error} -->`;
            result = result.replace(match[0], errorMsg);
        }
    }
    return result;
}
/**
 * Phase 2: Load full skill content and prepare for injection.
 */
export async function loadSkillContent(skill, options) {
    // Load full markdown body
    const rawContent = await skill.loadContent();
    // Substitute variables
    const variables = {
        ARGUMENTS: options.arguments?.join(' ') || '',
        SESSION_ID: options.sessionId || '',
        SKILL_DIR: skill.source.path,
        PROJECT_DIR: options.projectDir || '',
    };
    const withVariables = substituteVariables(rawContent, variables);
    // Execute inline commands (skip for MCP skills - security boundary)
    let finalContent;
    if (skill.source.trustLevel === 'mcp') {
        // MCP skills never execute inline shell commands
        finalContent = withVariables;
    }
    else {
        finalContent = await executeInlineCommands(withVariables, {
            cwd: options.projectDir,
            env: {
                CLAUDE_SKILL_DIR: skill.source.path,
                CLAUDE_SESSION_ID: options.sessionId || '',
            },
            timeoutMs: options.timeoutMs,
        });
    }
    return {
        content: finalContent,
        hooks: skill.frontmatter.hooks,
    };
}
/**
 * Extract skill arguments from user input.
 * /skill-name arg1 arg2 "arg with spaces"
 */
export function parseSkillInvocation(input) {
    // Remove leading slash if present
    const withoutSlash = input.startsWith('/') ? input.slice(1) : input;
    // Parse using shell-like quoting
    const parts = withoutSlash.match(/[^\s"']+|"([^"]*)"|'([^']*)'/g) || [];
    if (parts.length === 0) {
        return { skillName: '', args: [] };
    }
    // Remove quotes from quoted arguments
    const cleanParts = parts.map((p) => {
        if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
            return p.slice(1, -1);
        }
        return p;
    });
    return {
        skillName: cleanParts[0].toLowerCase().replace(/\s+/g, '-'),
        args: cleanParts.slice(1),
    };
}
/**
 * Check if a hook should run based on its condition.
 */
export function shouldHookRun(hook, toolCall) {
    if (!hook.if)
        return true;
    // Simple pattern matching: "Bash(git commit*)" matches "Bash" tool with "git commit..." input
    const condition = hook.if;
    // Check tool name
    if (!condition.includes('(')) {
        return toolCall.name === condition;
    }
    // Parse condition like "Bash(git commit*)"
    const match = condition.match(/^([^)]+)\(([^)]*)\)$/);
    if (!match)
        return false;
    const [, toolName, pattern] = match;
    if (toolCall.name !== toolName)
        return false;
    // Check input pattern (simplified - would use actual pattern matching in production)
    const inputStr = typeof toolCall.input === 'string' ? toolCall.input : JSON.stringify(toolCall.input);
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(inputStr);
}
//# sourceMappingURL=invoker.js.map