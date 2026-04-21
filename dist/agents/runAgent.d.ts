/**
 * runAgent
 *
 * The 15-step lifecycle for sub-agent execution.
 * Creates isolated execution contexts for each agent.
 */
import type { AgentDefinition, AgentId, AgentResult } from './types.js';
import type { ToolUseContext } from '../tools/types.js';
export interface RunAgentParams {
    agentDefinition: AgentDefinition;
    prompt: string;
    context: ToolUseContext;
    agentId: AgentId;
    modelOverride?: string;
    maxTurns?: number;
    allowedTools?: string[];
    isAsync?: boolean;
}
/**
 * The 15-step runAgent lifecycle
 */
export declare function runAgent(params: RunAgentParams): AsyncGenerator<any, AgentResult>;
//# sourceMappingURL=runAgent.d.ts.map