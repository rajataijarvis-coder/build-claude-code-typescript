/**
 * Streaming Tool Executor
 *
 * Starts executing tools while the model response is still streaming.
 * Speculative execution that overlaps tool execution with response generation.
 */
import { ToolUseContext } from './types.js';
import { ToolRegistry } from './registry.js';
/**
 * Streaming executor that manages tool lifecycle during response streaming
 */
export declare class StreamingToolExecutor {
    private tools;
    private context;
    private registry;
    private siblingAbortController;
    private discarded;
    private pendingProgress;
    private onProgress?;
    constructor(context: ToolUseContext, registry: ToolRegistry);
    /**
     * Add a tool to the executor as it's parsed from the stream
     *
     * Called by the streaming response parser each time a complete
     * tool_use block arrives.
     */
    addTool(block: {
        id: string;
        name: string;
        input: Record<string, unknown>;
    }, assistantMessage: {
        content: string;
    }): void;
    /**
     * The admission check - can this tool run now?
     *
     * A tool can execute if:
     * - No tools are currently executing, OR
     * - Both the new tool AND all running tools are concurrency-safe
     */
    private canExecuteTool;
    /**
     * Process the queue and start eligible tools
     *
     * Called after each tool is added and after each tool completes.
     */
    private processQueue;
    /**
     * Execute a single tool with full error handling
     */
    private executeTool;
    /**
     * Cancel sibling tools when a Bash command fails
     *
     * Bash commands often form implicit dependency chains:
     * mkdir build && cp src/* build/ && tar -czf dist.tar.gz build/
     * If mkdir fails, running cp and tar is pointless.
     */
    private cancelSiblings;
    /**
     * Get a short description of a tool call for error messages
     */
    private getToolDescription;
    /**
     * Get results that are ready to yield (synchronous, mid-stream)
     *
     * Called between chunks of the streaming API response.
     * Yields results in submission order, breaking if a serial tool is still executing.
     */
    getCompletedResults(): Generator<{
        toolId: string;
        result: {
            tool_call_id: string;
            content: string;
            isError?: boolean;
        };
    }>;
    /**
     * Get remaining results after stream completes (async, blocking)
     *
     * Called after the model's response is fully received.
     * Waits for all tools to complete and yields their results.
     */
    getRemainingResults(): AsyncGenerator<{
        toolId: string;
        result: {
            tool_call_id: string;
            content: string;
            isError?: boolean;
        };
    }>;
    /**
     * Discard this executor (e.g., on streaming fallback)
     *
     * Prevents any further tool execution. Results are abandoned.
     */
    discard(): void;
    /**
     * Check if this executor has been discarded
     */
    isDiscarded(): boolean;
}
//# sourceMappingURL=StreamingToolExecutor.d.ts.map