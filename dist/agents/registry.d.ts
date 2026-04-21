/**
 * Agent Registry
 *
 * Manages all available agent types.
 */
import type { AgentDefinition } from './types.js';
/**
 * Agent registry
 */
export declare class AgentRegistry {
    private agents;
    private loaded;
    /**
     * Initialize the registry
     */
    initialize(projectRoot: string): Promise<void>;
    /**
     * Get an agent by type
     */
    get(agentType: string): AgentDefinition | undefined;
    /**
     * Check if an agent exists
     */
    has(agentType: string): boolean;
    /**
     * List all available agents
     */
    list(): AgentDefinition[];
    /**
     * Filter by allowed types
     */
    filter(allowedTypes: string[]): AgentDefinition[];
    /**
     * Register a custom agent
     */
    register(agent: AgentDefinition): void;
}
export declare const agentRegistry: AgentRegistry;
//# sourceMappingURL=registry.d.ts.map