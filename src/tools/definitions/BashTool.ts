/**
 * BashTool - Execute bash commands
 *
 * The most complex tool with input-dependent concurrency classification.
 * Parses commands to determine if they're read-only and safe for parallel execution.
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
 * Known safe command sets for concurrency classification
 */
const BASH_SEARCH_COMMANDS = ['grep', 'find', 'rg', 'ag', 'ack'];
const BASH_READ_COMMANDS = ['cat', 'head', 'tail', 'less', 'more', 'ls', 'pwd', 'echo', 'which', 'type'];
const BASH_LIST_COMMANDS = ['ls', 'll', 'dir', 'tree'];
const BASH_NEUTRAL_COMMANDS = ['echo', 'printf', 'true', 'false', 'clear', 'date', 'whoami', 'hostname'];

/**
 * Parse compound command and classify subcommands
 *
 * "cd /tmp && mkdir build && ls build" -> ['cd /tmp', 'mkdir build', 'ls build']
 * Each subcommand is classified for safety.
 */
function classifyCommand(command: string): {
  isReadOnly: boolean;
  isConcurrencySafe: boolean;
  subcommands: string[];
} {
  // Split by operators
  const operators = /&&|;|\|\||\|/g;
  const subcommands = command
    .split(operators)
    .map((s) => s.trim())
    .filter(Boolean);

  let hasWrite = false;
  let hasDangerous = false;
  let hasBackground = false;

  for (const sub of subcommands) {
    const tokens = sub.split(/\s+/);
    const cmd = tokens[0];

    // Check for background process operator
    if (sub.includes('&')) {
      hasBackground = true;
    }

    // Neutral commands don't affect classification
    if (BASH_NEUTRAL_COMMANDS.includes(cmd)) continue;

    // Check for write operations
    const writeCommands = [
      'rm',
      'mv',
      'cp',
      'mkdir',
      'touch',
      'chmod',
      'chown',
      'dd',
      'mkfs',
      'mount',
    ];
    if (writeCommands.some((w) => sub.includes(w))) {
      hasWrite = true;
    }

    // Check for redirections (writes)
    if (sub.includes('>') || sub.includes('>>')) {
      hasWrite = true;
    }

    // Check for in-place editing with sed
    if (sub.includes('sed') && sub.includes('-i')) {
      hasWrite = true;
    }

    // Check for dangerous patterns using simple string checks
    const dangerousPatterns = [
      'rm -rf / ',
      'rm -rf /',
      '> /dev/sda',
      ':(){ :|:& };:',
    ];
    
    // Check for curl pipe patterns
    if (sub.includes('curl') && (sub.includes('| sh') || sub.includes('| bash'))) {
      hasDangerous = true;
    }
    
    for (const pattern of dangerousPatterns) {
      if (sub.includes(pattern)) {
        hasDangerous = true;
      }
    }
  }

  return {
    isReadOnly: !hasWrite,
    isConcurrencySafe: !hasWrite && !hasDangerous && !hasBackground,
    subcommands,
  };
}

export const BashTool = buildTool({
  name: 'Bash',
  description: 'Execute a bash command in the shell',
  inputSchema: BashInput,
  maxResultSizeChars: 30000,

  // INPUT-DEPENDENT: Same tool, different inputs = different safety
  isConcurrencySafe: (input) => {
    const classification = classifyCommand(input.command);
    return classification.isConcurrencySafe;
  },

  isReadOnly: (input) => {
    const classification = classifyCommand(input.command);
    return classification.isReadOnly;
  },

  checkPermissions: (input, context) => {
    try {
      const { isReadOnly, subcommands } = classifyCommand(input.command);

      // In plan mode, deny writes
      if (context.permissionMode === 'plan' && !isReadOnly) {
        return {
          behavior: 'deny',
          reason: 'Write operation blocked in plan mode',
        };
      }

      // Block obviously dangerous patterns using string checks
      const cmd = input.command;
      
      // Check for rm -rf root
      if (cmd.includes('rm -rf / ') || cmd === 'rm -rf /') {
        return {
          behavior: 'deny',
          reason: 'Dangerous: rm -rf /',
        };
      }
      
      // Check for rm -rf all
      if (cmd.includes('rm -rf /*')) {
        return {
          behavior: 'deny',
          reason: 'Dangerous: rm -rf /*',
        };
      }
      
      // Check for disk overwrite
      if (cmd.includes('> /dev/sda')) {
        return {
          behavior: 'deny',
          reason: 'Dangerous: disk overwrite',
        };
      }
      
      // Check for fork bomb
      if (cmd.includes(':(){ :|:& };:') || cmd.includes('fork bomb')) {
        return {
          behavior: 'deny',
          reason: 'Dangerous: fork bomb',
        };
      }
      
      // Check for curl pipe
      if (cmd.includes('curl') && (cmd.includes('| sh') || cmd.includes('| bash'))) {
        return {
          behavior: 'deny',
          reason: 'Dangerous: pipe from curl',
        };
      }

      // Warn about multi-command operations
      if (subcommands.length > 1 && !isReadOnly) {
        // Multi-command write operations need explicit permission
        return { behavior: 'passthrough' };
      }
    } catch {
      // Fail-safe: if we can't parse, require explicit permission
      return { behavior: 'passthrough' };
    }

    return { behavior: 'passthrough' };
  },

  call: async (input, context) => {
    const { command, cwd, timeout = 60000 } = input;

    // Apply timeout via abort controller
    const abortPromise = new Promise<never>((_, reject) => {
      context.abortController.signal.addEventListener('abort', () => {
        reject(new Error('Command aborted'));
      });
    });

    const execPromise = execAsync(command, {
      cwd: cwd || context.workingDirectory,
      timeout,
      maxBuffer: 1024 * 1024, // 1MB buffer
    });

    try {
      const { stdout, stderr } = await Promise.race([execPromise, abortPromise]);

      // Detect image output by magic bytes (simplified check)
      const hasImage = stdout.includes('\x89PNG') || stdout.includes('\xff\xd8\xff');

      const output = stdout || stderr || 'Command completed successfully';

      return {
        data: output,
        // Could include metadata about detected content type
      };
    } catch (error) {
      // Handle timeout or execution errors
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
