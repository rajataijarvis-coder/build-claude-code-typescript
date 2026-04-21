/**
 * Agent Tool
 *
 * The model-facing interface for spawning sub-agents.
 */
import { z } from 'zod';
import type { ToolUseContext } from '../tools/types.js';
/**
 * Build the agent tool input schema
 */
export declare function buildAgentSchema(options: {
    multiAgentEnabled: boolean;
    isolationEnabled: boolean;
    backgroundEnabled: boolean;
}): z.ZodType;
/**
 * Create the Agent tool
 */
export declare function createAgentTool(context: ToolUseContext): import("../tools/types.js").Tool<z.ZodType<any, z.ZodTypeDef, any>, unknown, unknown>;
//# sourceMappingURL=tool.d.ts.map