/**
 * Agent Registry
 *
 * Manages all available agent types.
 */
import { getBuiltInAgents } from './builtins.js';
import { loadUserAgents } from './frontmatter.js';
/**
 * Agent registry
 */
export class AgentRegistry {
    agents = new Map();
    loaded = false;
    /**
     * Initialize the registry
     */
    async initialize(projectRoot) {
        if (this.loaded)
            return;
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
    get(agentType) {
        return this.agents.get(agentType);
    }
    /**
     * Check if an agent exists
     */
    has(agentType) {
        return this.agents.has(agentType);
    }
    /**
     * List all available agents
     */
    list() {
        return Array.from(this.agents.values());
    }
    /**
     * Filter by allowed types
     */
    filter(allowedTypes) {
        return allowedTypes
            .map(type => this.agents.get(type))
            .filter((agent) => agent !== undefined);
    }
    /**
     * Register a custom agent
     */
    register(agent) {
        this.agents.set(agent.agentType, agent);
    }
}
// Singleton instance
export const agentRegistry = new AgentRegistry();
//# sourceMappingURL=registry.js.map