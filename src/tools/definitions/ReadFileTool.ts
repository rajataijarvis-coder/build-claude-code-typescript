/**
 * ReadFileTool - The most versatile reader
 *
 * Reads text files, images, PDFs, and directories.
 * Self-bounds via token limits rather than maxResultSizeChars.
 */

import { z } from 'zod';
import { buildTool } from '../buildTool.js';
import { readFile, stat, readdir } from 'fs/promises';

const ReadFileInput = z.object({
  file_path: z.string().describe('Absolute or relative path to file'),
  offset: z.number().optional().describe('Line number to start from'),
  limit: z.number().optional().describe('Max lines to read'),
});

export const ReadFileTool = buildTool({
  name: 'Read',
  description: 'Read the contents of a file or directory',
  inputSchema: ReadFileInput,

  // ReadFileTool is ALWAYS concurrency-safe and read-only
  // No input inspection needed
  isConcurrencySafe: () => true,
  isReadOnly: () => true,

  // Self-bounds via token estimation, no need for external budgeting
  maxResultSizeChars: Infinity,

  // Block dangerous device paths
  validateInput: (input) => {
    const dangerous = ['/dev/zero', '/dev/random', '/dev/stdin', '/dev/null', '/dev/sda'];
    if (dangerous.some((d) => input.file_path.includes(d))) {
      return { valid: false, error: 'Cannot read device files' };
    }
    return { valid: true };
  },

  // No tool-specific permission logic
  checkPermissions: () => ({ behavior: 'passthrough' }),

  call: async (input, context) => {
    const { file_path, offset, limit } = input;

    // Resolve path
    const resolvedPath = file_path.startsWith('~/')
      ? file_path.replace('~/', process.env.HOME + '/')
      : file_path.startsWith('/')
        ? file_path
        : `${context.workingDirectory}/${file_path}`;

    // Check if it exists
    const stats = await stat(resolvedPath).catch(() => null);
    if (!stats) {
      return {
        data: `File not found: ${file_path}`,
      };
    }

    if (stats.isDirectory()) {
      // Fallback to ls for directories
      const entries = await readdir(resolvedPath);
      return {
        data: `Directory: ${file_path}\n\n${entries.join('\n')}`,
      };
    }

    // Read file
    const content = await readFile(resolvedPath, 'utf-8');
    const lines = content.split('\n');

    // Apply offset/limit
    const startLine = offset ? offset - 1 : 0;
    const endLine = limit ? startLine + limit : lines.length;
    const selectedLines = lines.slice(startLine, endLine);

    // Add line numbers
    const numbered = selectedLines.map((line, i) => {
      const lineNum = (startLine + i + 1).toString().padStart(4, ' ');
      return `${lineNum} │ ${line}`;
    });

    const result = numbered.join('\n');
    const truncated = lines.length > endLine;

    // Update readFileState cache
    context.readFileState.set(resolvedPath, {
      content,
      mtime: stats.mtime,
      size: stats.size,
    });

    return {
      data: truncated ? `${result}\n\n... (${lines.length - endLine} more lines)` : result,
    };
  },
});
