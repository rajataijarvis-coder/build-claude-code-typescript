/**
 * Skills Loader
 *
 * Two-phase skill loading: frontmatter at startup, content on demand.
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import type {
  SkillSource,
  SkillIndex,
  LoadedSkill,
  SkillFrontmatter,
} from './types.js';
import { isSkillFile, extractSkillName } from './sources.js';

/**
 * Simple YAML frontmatter parser.
 * Extracts YAML between --- markers.
 */
function parseFrontmatter(content: string): {
  data: Record<string, any>;
  content: string;
} {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);

  if (!match) {
    return { data: {}, content };
  }

  const yamlContent = match[1];
  const bodyContent = match[2];

  // Simple YAML parsing (production would use a proper library)
  const data: Record<string, any> = {};
  for (const line of yamlContent.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value: any = line.slice(colonIndex + 1).trim();

    // Handle arrays (simple parsing)
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((v: string) => v.trim().replace(/^["']|["']$/g, ''));
    }

    // Handle booleans
    if (value === 'true') value = true;
    if (value === 'false') value = false;

    data[key] = value;
  }

  return { data, content: bodyContent };
}

/**
 * Phase 1: Scan all skill sources and extract frontmatter.
 * Returns index of available skills without loading full content.
 */
export async function scanSkills(sources: SkillSource[]): Promise<SkillIndex> {
  const skills = new Map<string, LoadedSkill>();

  for (const source of sources) {
    try {
      const entries = await readdir(source.path);

      for (const entry of entries) {
        if (!isSkillFile(entry)) continue;

        const filePath = join(source.path, entry);
        const fileStat = await stat(filePath);

        if (!fileStat.isFile()) continue;

        // Read just enough to parse frontmatter
        const fileContent = await readFile(filePath, 'utf-8');
        const parsed = parseFrontmatter(fileContent);
        const frontmatter = parsed.data as Partial<SkillFrontmatter>;

        if (!frontmatter.name) {
          console.warn(`Skill ${entry} missing required 'name' field`);
          continue;
        }

        const skillName = extractSkillName(entry);

        // Higher priority wins - skip if already exists with higher/equal priority
        if (skills.has(skillName)) {
          const existing = skills.get(skillName)!;
          if (source.priority >= existing.source.priority) {
            console.log(
              `Skipping ${skillName} from ${source.name} (lower priority)`
            );
            continue;
          }
        }

        // Store with lazy content loader
        skills.set(skillName, {
          name: skillName,
          frontmatter: frontmatter as SkillFrontmatter,
          source,
          filePath,
          loadContent: async () => parsed.content,
        });
      }
    } catch (error) {
      // Source directory doesn't exist - skip silently
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`Error scanning skills from ${source.path}:`, error);
      }
    }
  }

  return { skills, sources };
}

/**
 * Format skills for system prompt (cheap - uses frontmatter only).
 */
export function formatSkillsForSystemPrompt(index: SkillIndex): string {
  const lines: string[] = ['# Available Skills', ''];

  for (const [name, skill] of index.skills) {
    lines.push(`## ${skill.frontmatter.name}`);
    lines.push(`Command: /${name}`);
    lines.push(`Description: ${skill.frontmatter.description}`);

    if (skill.frontmatter.when_to_use) {
      lines.push(`When to use: ${skill.frontmatter.when_to_use}`);
    }

    if (skill.frontmatter.disable_model_invocation) {
      lines.push('Note: This skill cannot be invoked by the model.');
    }

    if (skill.frontmatter.context === 'fork') {
      lines.push('Note: Runs in isolated context (sub-agent).');
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get skill by name (case-insensitive).
 */
export function getSkillByName(
  index: SkillIndex,
  name: string
): LoadedSkill | undefined {
  const normalizedName = name.toLowerCase().replace(/^\//, '');
  return index.skills.get(normalizedName);
}

/**
 * Filter skills by tag.
 */
export function filterSkillsByTag(
  index: SkillIndex,
  tag: string
): LoadedSkill[] {
  return Array.from(index.skills.values()).filter((skill) =>
    skill.frontmatter.tags?.includes(tag)
  );
}

/**
 * Count skills by source.
 */
export function countSkillsBySource(index: SkillIndex): Map<string, number> {
  const counts = new Map<string, number>();

  for (const skill of index.skills.values()) {
    const current = counts.get(skill.source.name) || 0;
    counts.set(skill.source.name, current + 1);
  }

  return counts;
}
