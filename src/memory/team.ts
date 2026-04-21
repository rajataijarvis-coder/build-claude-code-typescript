/**
 * Team Memory Security
 *
 * Defense in depth for shared memory directories.
 */

import { join, resolve } from 'path';
import { realpath } from 'fs/promises';

/**
 * Path traversal attack detection
 * Layer 1: Input sanitization
 */
export function sanitizePathKey(input: string): string {
  // Reject null bytes
  if (input.includes('\0')) {
    throw new PathTraversalError('Null bytes detected');
  }

  // Reject URL-encoded traversals
  if (input.includes('%2e') || input.includes('%2f') || input.includes('%5c')) {
    throw new PathTraversalError('URL-encoded traversal detected');
  }

  // Reject backslashes (Windows-style)
  if (input.includes('\\')) {
    throw new PathTraversalError('Backslash detected');
  }

  // Reject absolute paths
  if (input.startsWith('/')) {
    throw new PathTraversalError('Absolute path detected');
  }

  // Normalize Unicode (catch fullwidth characters that normalize to ../)
  const normalized = input.normalize('NFC');
  if (normalized !== input) {
    // Re-check after normalization
    return sanitizePathKey(normalized);
  }

  return normalized;
}

/**
 * Layer 2 & 3: Path resolution and symlink checking
 */
export async function resolveTeamPath(
  memoryDir: string,
  filename: string
): Promise<string> {
  // Layer 1: Sanitize input
  const sanitized = sanitizePathKey(filename);

  // Layer 2: Resolve and validate prefix
  const teamDir = join(memoryDir, 'team');
  const resolved = resolve(teamDir, sanitized);

  // Trailing separator convention prevents prefix-only match
  const teamDirWithSep = teamDir.endsWith('/') ? teamDir : teamDir + '/';
  if (!resolved.startsWith(teamDirWithSep)) {
    throw new PathTraversalError('Resolved path outside team directory');
  }

  // Layer 3: Resolve symlinks on deepest existing ancestor
  try {
    const realPath = await realpath(resolved);
    if (!realPath.startsWith(teamDir)) {
      throw new PathTraversalError('Symlink target outside team directory');
    }
  } catch (error) {
    // File doesn't exist yet - that's fine for new writes
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  return resolved;
}

export class PathTraversalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathTraversalError';
  }
}

/**
 * Scope guidance for the model
 *
 * User memories: always private
 * Reference memories: usually team
 * Feedback memories: default to private unless project-wide
 *
 * Cross-check: Before saving a private feedback memory, check that
 * it does not contradict a team feedback memory.
 */
export function getScopeGuidance(type: string): string {
  const guidance: Record<string, string> = {
    user: 'Private only. Never team.',
    feedback: 'Default to private. Team only if project-wide convention.',
    project: 'Usually private. Team if coordinating across team members.',
    reference: 'Usually team. Private only if personal bookmark.'
  };
  return guidance[type] ?? 'Default to private.';
}
