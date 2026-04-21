/**
 * Frontmatter Agent Loader
 *
 * Load custom agents from .claude/agents/*.md files.
 */

import type { AgentDefinition, AgentSource } from './types.js';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

/**
 * Load agents from .claude/agents/ directory
 */
export async function loadUserAgents(
  projectRoot: string
): Promise<AgentDefinition[]> {
  const agentsDir = join(projectRoot, '.claude', 'agents');

  try {
    const entries = await readdir(agentsDir, { withFileTypes: true });
    const agents: AgentDefinition[] = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const agent = await loadAgentFromFile(
          join(agentsDir, entry.name),
          'user'
        );
        if (agent) {
          agents.push(agent);
        }
      }
    }

    return agents;
  } catch (error) {
    return [];
  }
}

/**
 * Load a single agent from markdown file
 */
async function loadAgentFromFile(
  filePath: string,
  source: AgentSource
): Promise<AgentDefinition | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    // Validate minimal frontmatter
    if (!frontmatter.description || !frontmatter.model) {
      console.warn(`Invalid frontmatter in ${filePath}`);
      return null;
    }

    // Derive agent type from filename
    const agentType = filePath
      .split('/')
      .pop()!
      .replace('.md', '');

    return {
      agentType,
      name: agentType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: frontmatter.description,
      model: frontmatter.model,
      permissionMode: frontmatter.permissionMode ?? 'ask',
      tools: frontmatter.tools ?? ['Read', 'Grep'],
      disallowedTools: frontmatter.disallowedTools,
      maxTurns: frontmatter.maxTurns,
      background: frontmatter.background ?? false,
      omitClaudeMd: frontmatter.omitClaudeMd ?? false,
      skills: frontmatter.skills,
      color: frontmatter.color,
      effort: frontmatter.effort,

      getSystemPrompt: () => body,
    };
  } catch (error) {
    console.warn(`Failed to load agent from ${filePath}:`, error);
    return null;
  }
}

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content: string): {
  frontmatter: any;
  body: string;
} {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterText = match[1];
  const body = match[2].trim();

  // Simple YAML-like parsing
  const frontmatter: any = {};
  for (const line of frontmatterText.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value: any = line.slice(colonIndex + 1).trim();

      // Try to parse as JSON
      try {
        value = JSON.parse(value);
      } catch {
        // Keep as string
      }

      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}
