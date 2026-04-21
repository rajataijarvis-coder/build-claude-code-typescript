/**
 * GrepTool - Search file contents
 *
 * Wraps ripgrep with pagination and exclusion patterns.
 * Always concurrency-safe and read-only.
 */
import { z } from 'zod';
import { buildTool } from '../buildTool.js';
import { spawn } from 'child_process';
const GrepInput = z.object({
    pattern: z.string().describe('Regex pattern to search for'),
    path: z.string().optional().describe('Directory or file to search'),
    file_pattern: z.string().optional().describe('File glob pattern'),
    head_limit: z.number().optional().describe('Max results to return (0 = unlimited)'),
    offset: z.number().optional().describe('Skip first N results'),
});
/**
 * VCS directories to exclude
 */
const VCS_DIRS = ['.git', '.svn', '.hg', '.bzr', '.jj', '.sl'];
/**
 * Build ripgrep arguments
 */
function buildRipgrepArgs(pattern, path, filePattern, offset) {
    const args = [
        '--line-number',
        '--with-filename',
        '--color=never',
        '--smart-case',
    ];
    // Add VCS exclusions
    for (const dir of VCS_DIRS) {
        args.push('--glob', `!${dir}/**`);
    }
    // Add file pattern if specified
    if (filePattern) {
        args.push('--glob', filePattern);
    }
    // Add offset if specified (ripgrep uses --after-context style skip)
    if (offset && offset > 0) {
        // Skip first N results - ripgrep doesn't have direct offset,
        // we'll handle this in post-processing
    }
    args.push(pattern);
    args.push(path);
    return args;
}
/**
 * Execute ripgrep and capture output
 */
async function executeRipgrep(pattern, path, filePattern, headLimit, offset) {
    return new Promise((resolve, reject) => {
        const args = buildRipgrepArgs(pattern, path, filePattern, offset);
        const proc = spawn('rg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        let matches = [];
        proc.stdout.on('data', (data) => {
            stdout += data.toString();
            // Parse matches as they come in
            const lines = stdout.split('\n');
            // Keep incomplete line for next chunk
            stdout = lines.pop() || '';
            for (const line of lines) {
                if (line.trim()) {
                    matches.push(line);
                }
            }
            // Check if we've hit the limit
            if (headLimit && headLimit > 0 && matches.length >= headLimit + (offset || 0)) {
                proc.kill();
            }
        });
        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        proc.on('close', (code) => {
            // Parse remaining buffer
            if (stdout.trim()) {
                matches.push(...stdout.split('\n').filter((l) => l.trim()));
            }
            // Handle offset
            if (offset && offset > 0) {
                matches = matches.slice(offset);
            }
            // Handle head limit
            let truncated = false;
            if (headLimit && headLimit > 0 && matches.length > headLimit) {
                truncated = true;
                matches = matches.slice(0, headLimit);
            }
            resolve({
                matches,
                total: matches.length + (truncated ? 1 : 0),
                truncated,
            });
        });
        proc.on('error', (err) => {
            reject(err);
        });
    });
}
export const GrepTool = buildTool({
    name: 'Grep',
    description: 'Search for patterns in files using ripgrep',
    inputSchema: GrepInput,
    // Grep is always read-only and concurrency-safe
    isConcurrencySafe: () => true,
    isReadOnly: () => true,
    // Search results with context lines can be large
    maxResultSizeChars: 100000,
    checkPermissions: () => ({ behavior: 'passthrough' }),
    call: async (input, context) => {
        const { pattern, path = '.', file_pattern, head_limit = 250, offset } = input;
        // Resolve path
        const resolvedPath = path.startsWith('~/')
            ? path.replace('~/', process.env.HOME + '/')
            : path.startsWith('/')
                ? path
                : `${context.workingDirectory}/${path}`;
        try {
            const { matches, total, truncated } = await executeRipgrep(pattern, resolvedPath, file_pattern, head_limit, offset);
            if (matches.length === 0) {
                return {
                    data: `No matches found for "${pattern}"`,
                };
            }
            const output = matches.join('\n');
            const suffix = truncated ? `\n\n... (${total - head_limit} more results)` : '';
            return {
                data: output + suffix,
            };
        }
        catch (error) {
            // Handle ripgrep not being installed
            if (error instanceof Error && error.message.includes('ENOENT')) {
                return {
                    data: 'Error: ripgrep (rg) is not installed. Install with: brew install ripgrep',
                };
            }
            throw error;
        }
    },
});
//# sourceMappingURL=GrepTool.js.map