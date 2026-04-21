/**
 * Tool Orchestrator - Partition and Execute Tool Batches
 *
 * Groups consecutive concurrency-safe tools into parallel batches,
 * isolating unsafe tools into serial batches.
 */
import { ToolCall, ToolUseContext } from './types.js';
import { ToolRegistry } from './registry.js';
/**
 * A batch of tool calls with execution strategy
 */
export interface ToolBatch {
    parallel: boolean;
    calls: ToolCall[];
}
/**
 * Result of a single tool execution within a batch
 */
interface BatchToolResult {
    call: ToolCall;
    result: {
        tool_call_id: string;
        content: string;
        isError?: boolean;
    };
    contextModifier?: (context: ToolUseContext) => ToolUseContext;
}
/**
 * Partition tool calls into concurrent and serial batches
 *
 * Walks the array left-to-right, grouping consecutive concurrency-safe
 * tools into parallel batches. Any unsafe tool breaks the run.
 *
 * Example: [Read, Read, Grep, Edit, Read]
 *   -> Batch 1: [Read, Read, Grep] (parallel)
 *   -> Batch 2: [Edit] (serial)
 *   -> Batch 3: [Read] (parallel)
 */
export declare function partitionToolCalls(calls: ToolCall[], registry: ToolRegistry): Promise<ToolBatch[]>;
/**
 * Execute all partitioned batches in order
 *
 * This is the main entry point for tool orchestration.
 */
export declare function executeToolBatches(batches: ToolBatch[], initialContext: ToolUseContext, registry: ToolRegistry): AsyncGenerator<BatchToolResult, ToolUseContext>;
/**
 * Convenience function: partition and execute in one call
 */
export declare function executeToolCalls(calls: ToolCall[], context: ToolUseContext, registry: ToolRegistry): AsyncGenerator<BatchToolResult, ToolUseContext>;
export {};
//# sourceMappingURL=orchestrator.d.ts.map