/**
 * Tool Execution Pipeline
 *
 * The 14-step execution pipeline for tool calls.
 */
import { Tool, ToolResult, ToolUseContext, ToolCall } from './types.js';
import { ToolRegistry } from './registry.js';
export interface PipelineState {
    toolCall: ToolCall;
    tool: Tool;
    parsedInput: unknown;
    abortController: AbortController;
}
/**
 * The 14-step execution pipeline
 */
export declare function executeToolPipeline(toolCall: ToolCall, context: ToolUseContext, registry: ToolRegistry): Promise<ToolResult<unknown>>;
//# sourceMappingURL=pipeline.d.ts.map