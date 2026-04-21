/**
 * Skill Sources
 *
 * Resolves skill directories from seven sources with precedence.
 */

import { homedir } from 'os';
import { join, dirname, resolve } from 'path';
import { stat } from 'fs/promises';
import type { SkillSource } from './types.js';

/**
 * Options for resolving skill sources.
 */
export interface ResolveSkillSourcesOptions {
  projectDir?: string;
  additionalDirs?: string[];
  managedPath?: string;
}

/**
 * Resolve all skill sources in precedence order.
 * Higher priority wins when skills have the same name.
 */
export async function resolveSkillSources(
  options: ResolveSkillSourcesOptions
): Promise<SkillSource[]> {
  const sources: SkillSource[] = [];

  // Priority 1: Managed/Policy (enterprise-controlled)
  if (options.managedPath) {
    sources.push({
      priority: 1,
      name: 'managed',
      path: join(options.managedPath, '.claude', 'skills'),
      trustLevel: 'managed',
    });
  }

  // Priority 2: User home directory
  sources.push({
    priority: 2,
    name: 'user',
    path: join(homedir(), '.claude', 'skills'),
    trustLevel: 'user',
  });

  // Priority 3: Project directory (walk up to find .claude/skills/)
  if (options.projectDir) {
    const projectSkillDir = await findProjectSkillDir(options.projectDir);
    if (projectSkillDir) {
      sources.push({
        priority: 3,
        name: 'project',
        path: projectSkillDir,
        trustLevel: 'project',
      });
    }
  }

  // Priority 4: Additional directories (--add-dir flag)
  for (const dir of options.additionalDirs || []) {
    sources.push({
      priority: 4,
      name: `additional-${dir}`,
      path: join(resolve(dir), '.claude', 'skills'),
      trustLevel: 'project',
    });
  }

  // Priority 5: Legacy commands directory
  if (options.projectDir) {
    const legacyPath = join(options.projectDir, '.claude', 'commands');
    try {
      await stat(legacyPath);
      sources.push({
        priority: 5,
        name: 'legacy',
        path: legacyPath,
        trustLevel: 'project',
      });
    } catch {
      // Legacy directory doesn't exist - skip
    }
  }

  return sources.sort((a, b) => a.priority - b.priority);
}

/**
 * Walk up directory tree to find .claude/skills/
 */
async function findProjectSkillDir(startDir: string): Promise<string | null> {
  let current = startDir;

  while (current !== dirname(current)) {
    const skillDir = join(current, '.claude', 'skills');
    try {
      const stats = await stat(skillDir);
      if (stats.isDirectory()) return skillDir;
    } catch {
      // Directory doesn't exist, continue walking up
    }
    current = dirname(current);
  }

  return null;
}

/**
 * Filter sources by trust level.
 */
export function filterSourcesByTrust(
  sources: SkillSource[],
  allowedLevels: SkillSource['trustLevel'][]
): SkillSource[] {
  return sources.filter((s) => allowedLevels.includes(s.trustLevel));
}

/**
 * Check if a path is a skill file (ends with .md or .MD).
 */
export function isSkillFile(filename: string): boolean {
  return filename.endsWith('.md') || filename.endsWith('.MD');
}

/**
 * Extract skill name from filename (removes extension, lowercases).
 */
export function extractSkillName(filename: string): string {
  return filename.replace(/\.md$/i, '').toLowerCase().replace(/\s+/g, '-');
}
