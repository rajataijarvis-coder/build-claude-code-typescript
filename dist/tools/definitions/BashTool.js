/**
 * BashTool - Execute bash commands with concurrency classification
 *
 * The most complex tool because the same tool can be either
 * concurrency-safe or not depending on the command.
 */
import { z } from 'zod';
import { buildTool } from '../buildTool.js';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
const BashInput = z.object({
    command: z.string().describe('The bash command to execute'),
    cwd: z.string().optional().describe('Working directory'),
    timeout: z.number().optional().describe('Timeout in milliseconds'),
});
/**
 * Command sets for concurrency classification
 */
const SEARCH_COMMANDS = new Set(['grep', 'find', 'rg', 'ag', 'ack', 'fd']);
const READ_COMMANDS = new Set(['cat', 'head', 'tail', 'less', 'more', 'ls', 'pwd', 'echo', 'which', 'type', 'file', 'stat', 'wc', 'jq', 'yq']);
const LIST_COMMANDS = new Set(['ls', 'll', 'dir', 'tree', 'find']);
const NEUTRAL_COMMANDS = new Set(['echo', 'printf', 'true', 'false', 'clear', 'date', 'whoami', 'hostname', 'uname']);
const WRITE_COMMANDS = new Set(['rm', 'mv', 'cp', 'mkdir', 'touch', 'chmod', 'chown', 'dd', 'mkfs', 'mount', 'umount', 'tar', 'zip', 'unzip']);
/**
 * Split compound commands by operators
 * "cd /tmp && mkdir build && ls build" -> ['cd /tmp', 'mkdir build', 'ls build']
 */
function splitCommandWithOperators(command) {
    const operators = /&&|;|\|\||\|/g;
    return command
        .split(operators)
        .map(s => s.trim())
        .filter(Boolean);
}
/**
 * Classify a single subcommand
 */
function classifySubcommand(subcommand) {
    const tokens = subcommand.split(/\s+/);
    const cmd = tokens[0];
    const isSearch = SEARCH_COMMANDS.has(cmd);
    const isRead = READ_COMMANDS.has(cmd);
    const isNeutral = NEUTRAL_COMMANDS.has(cmd);
    const isWrite = WRITE_COMMANDS.has(cmd);
    // Check for redirections (writes)
    const hasRedirection = subcommand.includes('>') || subcommand.includes('>>');
    // Check for in-place editing
    const hasInPlaceEdit = cmd === 'sed' && subcommand.includes('-i');
    // Check for background process
    const hasBackground = subcommand.includes('&');
    return {
        isReadOnly: (isSearch || isRead || isNeutral) && !hasRedirection && !hasInPlaceEdit && !hasBackground,
        isSearch,
        isWrite: isWrite || hasRedirection || hasInPlaceEdit,
        command: cmd,
    };
}
/**
 * Full command classification
 */
export function classifyCommand(command) {
    const subcommands = splitCommandWithOperators(command);
    let hasWrite = false;
    let hasDangerous = false;
    let hasBackground = false;
    let hasPipe = command.includes('|') && !command.includes('||');
    for (const sub of subcommands) {
        const classification = classifySubcommand(sub);
        if (classification.isWrite) {
            hasWrite = true;
        }
        if (sub.includes('&')) {
            hasBackground = true;
        }
        // Check for dangerous patterns
        const dangerousPatterns = [
            'rm -rf / ',
            'rm -rf /',
            'rm -rf /*',
            '> /dev/sda',
            ':(){ :|:& };:',
            'fork bomb',
        ];
        for (const pattern of dangerousPatterns) {
            if (sub.includes(pattern)) {
                hasDangerous = true;
            }
        }
        // Check for curl pipe
        if (sub.includes('curl') && (sub.includes('| sh') || sub.includes('| bash'))) {
            hasDangerous = true;
        }
    }
    return {
        isReadOnly: !hasWrite,
        isConcurrencySafe: !hasWrite && !hasDangerous && !hasBackground,
        subcommands,
        hasBackground,
        hasPipe,
    };
}
export const BashTool = buildTool({
    name: 'Bash',
    description: 'Execute a bash command in the shell. Commands are classified for concurrency safety based on their content.',
    inputSchema: BashInput,
    maxResultSizeChars: 30000,
    // INPUT-DEPENDENT CONCURRENCY CLASSIFICATION
    // Same tool, different inputs = different safety
    isConcurrencySafe: (input) => {
        const classification = classifyCommand(input.command);
        return classification.isConcurrencySafe;
    },
    isReadOnly: (input) => {
        const classification = classifyCommand(input.command);
        return classification.isReadOnly;
    },
    // Validation
    validateInput: (input) => {
        const { command } = input;
        // Block empty commands
        if (!command.trim()) {
            return { valid: false, error: 'Empty command' };
        }
        // Block dangerous patterns
        const dangerousPatterns = [
            { pattern: 'rm -rf / ', reason: 'Dangerous: rm -rf /' },
            { pattern: 'rm -rf /', exact: true, reason: 'Dangerous: rm -rf /' },
            { pattern: '> /dev/sda', reason: 'Dangerous: disk overwrite' },
            { pattern: ':(){ :|:& };:', reason: 'Dangerous: fork bomb' },
        ];
        for (const { pattern, reason, exact } of dangerousPatterns) {
            const matches = exact ? command.trim() === pattern : command.includes(pattern);
            if (matches) {
                return { valid: false, error: reason };
            }
        }
        return { valid: true };
    },
    // Permission check
    checkPermissions: (input, context) => {
        const classification = classifyCommand(input.command);
        // In plan mode, deny writes
        if (context.permissionMode === 'plan' && !classification.isReadOnly) {
            return {
                behavior: 'deny',
                reason: 'Write operation blocked in plan mode',
            };
        }
        // Complex multi-command writes require explicit permission
        if (classification.subcommands.length > 1 && !classification.isReadOnly) {
            return { behavior: 'passthrough' };
        }
        return { behavior: 'passthrough' };
    },
    // Execution
    call: async (input, context) => {
        const { command, cwd, timeout = 60000 } = input;
        // Check abort signal
        if (context.abortController.signal.aborted) {
            throw new Error('Command aborted before execution');
        }
        const execPromise = execAsync(command, {
            cwd: cwd || context.workingDirectory,
            timeout,
            maxBuffer: 1024 * 1024, // 1MB
        });
        // Race with abort signal
        const abortPromise = new Promise((_, reject) => {
            const handler = () => reject(new Error('Command aborted'));
            context.abortController.signal.addEventListener('abort', handler, { once: true });
        });
        try {
            const { stdout, stderr } = await Promise.race([execPromise, abortPromise]);
            // Detect image output by magic bytes
            const hasImage = stdout.includes('\x89PNG') || stdout.includes('\xff\xd8\xff');
            const output = stdout || stderr || '(no output)';
            return {
                data: output,
                metadata: {
                    hasImage,
                    command,
                    cwd: cwd || context.workingDirectory,
                },
            };
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('timeout')) {
                    throw new Error(`Command timed out after ${timeout}ms`);
                }
                if (error.message.includes('aborted')) {
                    throw new Error('Command aborted by user');
                }
            }
            throw error;
        }
    },
});
//# sourceMappingURL=BashTool.js.map