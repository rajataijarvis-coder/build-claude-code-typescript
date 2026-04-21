/**
 * WriteFileTool - Write content to files
 *
 * Creates new files or overwrites existing ones.
 * Always runs serially (not concurrency-safe) to prevent conflicts.
 */
import { z } from 'zod';
import { buildTool } from '../buildTool.js';
import { writeFile, stat, mkdir } from 'fs/promises';
import { dirname } from 'path';
const WriteFileInput = z.object({
    file_path: z.string().describe('Absolute or relative path to file'),
    content: z.string().describe('Content to write'),
    create_dirs: z.boolean().optional().describe('Create parent directories if missing'),
});
export const WriteFileTool = buildTool({
    name: 'Write',
    description: 'Write content to a file',
    inputSchema: WriteFileInput,
    // Write operations are NEVER concurrency-safe
    // They must run serially to prevent conflicts
    isConcurrencySafe: () => false,
    isReadOnly: () => false,
    // Diffs can be large but the model needs them
    maxResultSizeChars: 100000,
    // Validate input
    validateInput: (input) => {
        // Block device paths
        const dangerous = ['/dev/', '/sys/', '/proc/'];
        if (dangerous.some((d) => input.file_path.startsWith(d))) {
            return { valid: false, error: 'Cannot write to system directories' };
        }
        return { valid: true };
    },
    checkPermissions: (input, context) => {
        // In plan mode, deny all writes
        if (context.permissionMode === 'plan') {
            return {
                behavior: 'deny',
                reason: 'Write operation blocked in plan mode',
            };
        }
        // Check if file is already in readFileState (stale detection)
        const resolvedPath = input.file_path.startsWith('~/')
            ? input.file_path.replace('~/', process.env.HOME + '/')
            : input.file_path.startsWith('/')
                ? input.file_path
                : `${context.workingDirectory}/${input.file_path}`;
        const cached = context.readFileState.get(resolvedPath);
        if (cached) {
            // File was previously read - could be stale
            // For now, just warn. In production, would check actual mtime
            const staleWarning = `Warning: File ${input.file_path} was previously read. May be stale.`;
            console.warn(staleWarning);
        }
        return { behavior: 'passthrough' };
    },
    call: async (input, context) => {
        const { file_path, content, create_dirs = true } = input;
        // Resolve path
        const resolvedPath = file_path.startsWith('~/')
            ? file_path.replace('~/', process.env.HOME + '/')
            : file_path.startsWith('/')
                ? file_path
                : `${context.workingDirectory}/${file_path}`;
        // Create parent directories if needed
        if (create_dirs) {
            const parentDir = dirname(resolvedPath);
            await mkdir(parentDir, { recursive: true });
        }
        // Write file
        await writeFile(resolvedPath, content, 'utf-8');
        // Update readFileState cache
        const newStats = await stat(resolvedPath);
        context.readFileState.set(resolvedPath, {
            content,
            mtime: newStats.mtime,
            size: newStats.size,
        });
        return {
            data: `Successfully wrote ${content.length} characters to ${file_path}`,
        };
    },
});
//# sourceMappingURL=WriteFileTool.js.map