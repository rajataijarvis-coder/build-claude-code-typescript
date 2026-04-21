/**
 * Agent Types
 *
 * Type definitions for the sub-agent system.
 */
export function createAgentId() {
    return `agent-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}
//# sourceMappingURL=types.js.map