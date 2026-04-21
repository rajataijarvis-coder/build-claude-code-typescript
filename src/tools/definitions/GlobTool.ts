/**
 * GlobTool - Find files by pattern
 *
 * Simple file globbing for finding files.
 * Always concurrency-safe and read-only.
 */

import { z } from 'zod';
import { buildTool } from '../buildTool.js';
import { readdir } from 'fs/promises';
import { join } from 'path';

const GlobInput = z.object({
  pattern: z.string().describe('Glob pattern (e.g., "**/*.ts")'),
  path: z.string().optional().describe('Directory to search in'),
  limit: z.number().optional().describe('Max results to return'),
});

/**
 * Simple recursive glob implementation
 */
async function simpleGlob(
  dir: string,
  pattern: string,
  limit: number
): Promise<string[]> {
  const results: string[] = [];
  const extensions = pattern.replace('**/*.', '');
  
  async function walk(currentDir: string, relativePath: string) {
    if (results.length >= limit) return;
    
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (results.length >= limit) break;
        
        const fullPath = join(currentDir, entry.name);
        const relPath = relativePath ? join(relativePath, entry.name) : entry.name;
        
        if (entry.isDirectory()) {
          // Recurse into subdirectories
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await walk(fullPath, relPath);
          }
        } else if (entry.isFile()) {
          // Check if file matches pattern
          if (pattern === '**/*' || entry.name.endsWith(extensions)) {
            results.push(relPath);
          }
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }
  
  await walk(dir, '');
  return results;
}

export const GlobTool = buildTool({
  name: 'Glob',
  description: 'Find files matching a glob pattern',
  inputSchema: GlobInput,

  // Glob is always read-only and concurrency-safe
  isConcurrencySafe: () => true,
  isReadOnly: () => true,

  // File lists can be large
  maxResultSizeChars: 100000,

  checkPermissions: () => ({ behavior: 'passthrough' }),

  call: async (input, context) => {
    const { pattern, path = '.', limit = 1000 } = input;

    // Resolve path
    const resolvedPath = path.startsWith('~/')
      ? path.replace('~/', process.env.HOME + '/')
      : path.startsWith('/')
        ? path
        : `${context.workingDirectory}/${path}`;

    try {
      const files = await simpleGlob(resolvedPath, pattern, limit);
      const truncated = files.length >= limit;

      if (files.length === 0) {
        return {
          data: `No files matching "${pattern}"`,
        };
      }

      const output = files.join('\n');
      const suffix = truncated ? `\n\n... (more files)` : '';

      return {
        data: output + suffix,
      };
    } catch (error) {
      return {
        data: `Error globbing files: ${(error as Error).message}`,
      };
    }
  },
});
