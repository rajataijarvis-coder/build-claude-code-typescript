/**
 * Frontmatter Agent Loader
 *
 * Load custom agents from .claude/agents/*.md files.
 */
import type { AgentDefinition } from './types.js';
/**
 * Load agents from .claude/agents/ directory
 */
export declare function loadUserAgents(projectRoot: string): Promise<AgentDefinition[]>;
//# sourceMappingURL=frontmatter.d.ts.map