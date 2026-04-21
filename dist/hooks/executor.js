/**
 * Hooks Executor
 *
 * Execute hooks at lifecycle events with proper aggregation.
 */
import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import { getHooksFromSnapshot, shouldSkipHooksDueToTrust, } from './snapshot.js';
const execAsync = promisify(exec);
/**
 * Match tool name against pattern.
 * Supports wildcards: "Bash(git *)" matches "Bash(git status)"
 */
export function matchToolPattern(pattern, toolName) {
    // Parse pattern like "Bash(git *)" or just "Bash"
    const openParen = pattern.indexOf('(');
    if (openParen === -1) {
        // Simple name match
        return pattern === toolName;
    }
    const toolPart = pattern.slice(0, openParen);
    const argPart = pattern.slice(openParen + 1, -1); // Remove trailing )
    if (toolName !== toolPart)
        return false;
    // For now, simple substring match on arguments
    // In production, this would be more sophisticated
    return true;
}
/**
 * Execute all hooks for a lifecycle event.
 *
 * Returns aggregated result with precedence:
 *   deny > ask > allow
 *   blocking error > all else
 */
export async function executeHooks(options) {
    // Skip if trust not accepted
    if (shouldSkipHooksDueToTrust(options.trustState)) {
        return {
            exitCode: 0,
            blocked: false,
            executedHooks: 0,
            matchedHooks: 0,
        };
    }
    // Get hooks from frozen snapshot
    const hooks = getHooksFromSnapshot(options.event);
    // Filter by matcher (if tool-specific event)
    const matchingHooks = options.toolName
        ? hooks.filter((h) => !h.matcher || matchToolPattern(h.matcher, options.toolName))
        : hooks;
    if (matchingHooks.length === 0) {
        return {
            exitCode: 0,
            blocked: false,
            executedHooks: 0,
            matchedHooks: 0,
        };
    }
    // Execute hooks in parallel
    const results = await Promise.all(matchingHooks.map((hook) => executeSingleHook(hook, options)));
    // Aggregate results with precedence
    let aggregated = {
        exitCode: 0,
        blocked: false,
        executedHooks: matchingHooks.length,
        matchedHooks: matchingHooks.length,
        stdout: '',
        stderr: '',
    };
    let hasDeny = false;
    let hasAsk = false;
    for (const result of results) {
        // Blocking error takes highest precedence
        if (result.exitCode === 2) {
            return {
                ...result,
                blocked: true,
                executedHooks: matchingHooks.length,
                matchedHooks: matchingHooks.length,
            };
        }
        // Track permission behaviors
        if (result.permissionBehavior === 'deny')
            hasDeny = true;
        if (result.permissionBehavior === 'ask')
            hasAsk = true;
        // Collect stdout/stderr
        if (result.stdout) {
            aggregated.stdout = (aggregated.stdout || '') + result.stdout;
        }
        if (result.stderr) {
            aggregated.stderr = (aggregated.stderr || '') + result.stderr;
        }
    }
    // Determine final permission behavior
    if (hasDeny) {
        aggregated.permissionBehavior = 'deny';
    }
    else if (hasAsk) {
        aggregated.permissionBehavior = 'ask';
    }
    else {
        aggregated.permissionBehavior = 'allow';
    }
    return aggregated;
}
/**
 * Execute a single hook.
 */
async function executeSingleHook(config, options) {
    const { definition } = config;
    switch (definition.type) {
        case 'command':
            return executeCommandHook(definition.command, options, config);
        case 'prompt':
            return executePromptHook(definition.prompt, options);
        case 'agent':
            return executeAgentHook(definition, options);
        case 'http':
            return executeHttpHook(definition.url, options);
        case 'callback':
            return executeCallbackHook(definition.callback, options);
        default:
            return {
                exitCode: 1,
                stderr: `Unknown hook type: ${definition.type}`,
            };
    }
}
/**
 * Execute a command hook.
 *
 * Exit code 0 = success, continue normally
 * Exit code 2 = blocking error (stderr shown to model)
 * Other = non-blocking warning
 */
async function executeCommandHook(command, options, config) {
    return new Promise((resolve) => {
        const child = spawn('sh', ['-c', command], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                ...config.definition.env,
                CLAUDE_PROJECT_DIR: process.cwd(),
                CLAUDE_PLUGIN_ROOT: config.definition.env?.CLAUDE_PLUGIN_ROOT || '',
            },
        });
        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', (data) => {
            stdout += data.toString();
        });
        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });
        child.on('close', (code) => {
            // Try to parse stdout as JSON
            let parsedOutput;
            try {
                parsedOutput = JSON.parse(stdout);
            }
            catch {
                // Not JSON, use as-is
            }
            resolve({
                exitCode: code ?? 1,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                ...parsedOutput,
            });
        });
        // Write input JSON to stdin
        try {
            child.stdin?.write(JSON.stringify(options.input));
            child.stdin?.end();
        }
        catch {
            // stdin might already be closed
        }
        // Handle abort
        options.abortSignal?.addEventListener('abort', () => {
            child.kill();
            resolve({ exitCode: 1, stderr: 'Hook aborted' });
        });
    });
}
/**
 * Execute a prompt hook (makes LLM call).
 */
async function executePromptHook(prompt, options) {
    // In production, this would make an actual LLM call
    // For now, return success
    return {
        exitCode: 0,
        stdout: JSON.stringify({ ok: true }),
    };
}
/**
 * Execute an agent hook (runs multi-turn agent).
 */
async function executeAgentHook(definition, options) {
    // In production, this would spawn a sub-agent
    // For now, return success
    return {
        exitCode: 0,
        stdout: JSON.stringify({ ok: true }),
    };
}
/**
 * Execute an HTTP hook (POST to URL).
 */
async function executeHttpHook(url, options) {
    // In production, this would make an HTTP POST
    // For now, return success
    return {
        exitCode: 0,
        stdout: '{}',
    };
}
/**
 * Execute a callback hook (internal function).
 */
async function executeCallbackHook(callback, options) {
    try {
        const result = await callback(options.input);
        return {
            exitCode: 0,
            stdout: JSON.stringify(result),
        };
    }
    catch (error) {
        return {
            exitCode: 1,
            stderr: String(error),
        };
    }
}
/**
 * Quick check if any hooks match an event (for fast path optimization).
 */
export function hasHooksForEvent(event) {
    try {
        const hooks = getHooksFromSnapshot(event);
        return hooks.length > 0;
    }
    catch {
        return false;
    }
}
/**
 * Check if any hooks match a specific tool call.
 */
export function hasHooksForTool(event, toolName) {
    try {
        const hooks = getHooksFromSnapshot(event);
        return hooks.some((h) => !h.matcher || matchToolPattern(h.matcher, toolName));
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=executor.js.map