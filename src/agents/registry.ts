/**
 * Agent Registry
 *
 * Manages all available agent types.
 */

import type { AgentDefinition } from './types.js';
import { getBuiltInAgents } from './builtins.js';
import { loadUserAgents } from './frontmatter.js';

/**
 * Agent registry
 */
export class AgentRegistry {
  private agents = new Map<string, AgentDefinition>();
  private loaded = false;

  /**
   * Initialize the registry
   */
  async initialize(projectRoot: string): Promise<void> {
    if (this.loaded) return;

    // Load built-in agents
    const builtIns = getBuiltInAgents();
    for (const agent of builtIns) {
      this.agents.set(agent.agentType, agent);
    }

    // Load user-defined agents
    const userAgents = await loadUserAgents(projectRoot);
    for (const agent of userAgents) {
      this.agents.set(agent.agentType, agent);
    }

    this.loaded = true;
  }

  /**
   * Get an agent by type
   */
  get(agentType: string): AgentDefinition | undefined {
    return this.agents.get(agentType);
  }

  /**
   * Check if an agent exists
   */
  has(agentType: string): boolean {
    return this.agents.has(agentType);
  }

  /**
   * List all available agents
   */
  list(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  /**
   * Filter by allowed types
   */
  filter(allowedTypes: string[]): AgentDefinition[] {
    return allowedTypes
      .map(type => this.agents.get(type))
      .filter((agent): agent is AgentDefinition => agent !== undefined);
  }

  /**
   * Register a custom agent
   */
  register(agent: AgentDefinition): void {
    this.agents.set(agent.agentType, agent);
  }
}

// Singleton instance
export const agentRegistry = new AgentRegistry();
