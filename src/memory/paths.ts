/**
 * Memory Path Resolution
 * 
 * Git-scoped memory directories with path sanitization.
 */

import { homedir } from 'os';
import { join } from 'path';

/**
 * Resolve the memory directory for a project.
 * Git root takes precedence over working directory.
 */
export async function resolveMemoryPath(
  gitRoot: string | null,
  workingDir: string
): Promise<string> {
  const basePath = gitRoot ?? workingDir;
  const sanitized = sanitizePath(basePath);
  return join(homedir(), '.claude', 'projects', sanitized, 'memory');
}

/**
 * Sanitize a path for use as a directory name.
 * Converts slashes to dashes, removes problematic characters.
 */
export function sanitizePath(input: string): string {
  return input
    .replace(/^\//, '')                    // Remove leading slash
    .replace(/\//g, '-')                   // Slashes to dashes
    .replace(/\\/g, '-')                   // Backslashes to dashes
    .replace(/[^a-zA-Z0-9\-_.]/g, '')      // Remove special chars
    .replace(/-+/g, '-')                   // Collapse multiple dashes
    .replace(/^-|-$/g, '');               // Trim leading/trailing dashes
}

/**
 * Resolve team memory subdirectory path
 */
export function getTeamMemoryPath(memoryDir: string): string {
  return join(memoryDir, 'team');
}

/**
 * Resolve daily log path for KAIROS mode
 */
export function getDailyLogPath(memoryDir: string, date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return join(memoryDir, 'logs', String(year), month, `${year}-${month}-${day}.md`);
}
