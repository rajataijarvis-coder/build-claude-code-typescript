/**
 * Streaming Tool Executor
 *
 * Starts executing tools while the model response is still streaming.
 * Speculative execution that overlaps tool execution with response generation.
 */
import { executeToolPipeline } from './pipeline.js';
/**
 * Streaming executor that manages tool lifecycle during response streaming
 */
export class StreamingToolExecutor {
    tools = [];
    context;
    registry;
    siblingAbortController;
    discarded = false;
    pendingProgress = [];
    onProgress;
    constructor(context, registry) {
        this.context = context;
        this.registry = registry;
        this.siblingAbortController = new AbortController();
    }
    /**
     * Add a tool to the executor as it's parsed from the stream
     *
     * Called by the streaming response parser each time a complete
     * tool_use block arrives.
     */
    addTool(block, assistantMessage) {
        if (this.discarded)
            return;
        const tool = this.registry.lookup(block.name);
        // Determine concurrency safety
        let isSafe = false;
        if (tool) {
            const parseResult = tool.inputSchema.safeParse(block.input);
            if (parseResult.success) {
                try {
                    isSafe = tool.isConcurrencySafe(parseResult.data);
                }
                catch {
                    isSafe = false;
                }
            }
        }
        // Create tracked tool
        const trackedTool = {
            id: block.id,
            call: {
                id: block.id,
                name: block.name,
                input: block.input,
            },
            status: 'queued',
            isConcurrencySafe: isSafe,
            abortController: new AbortController(),
        };
        // Unknown tool = immediate error
        if (!tool) {
            trackedTool.status = 'completed';
            trackedTool.result = {
                tool_call_id: block.id,
                content: `Error: Unknown tool "${block.name}"`,
                isError: true,
            };
        }
        this.tools.push(trackedTool);
        // Try to start execution immediately
        void this.processQueue();
    }
    /**
     * The admission check - can this tool run now?
     *
     * A tool can execute if:
     * - No tools are currently executing, OR
     * - Both the new tool AND all running tools are concurrency-safe
     */
    canExecuteTool(tool) {
        const executing = this.tools.filter(t => t.status === 'executing');
        if (executing.length === 0) {
            return true; // Nothing running, we're good
        }
        // All executing must be safe AND this tool must be safe
        return tool.isConcurrencySafe && executing.every(t => t.isConcurrencySafe);
    }
    /**
     * Process the queue and start eligible tools
     *
     * Called after each tool is added and after each tool completes.
     */
    async processQueue() {
        if (this.discarded)
            return;
        for (const tool of this.tools) {
            if (tool.status !== 'queued')
                continue;
            if (this.canExecuteTool(tool)) {
                // Start this tool
                tool.status = 'executing';
                tool.promise = this.executeTool(tool);
                void tool.promise.finally(() => {
                    void this.processQueue(); // Re-check queue when done
                });
            }
            else if (!tool.isConcurrencySafe) {
                // Non-concurrent tool blocked by running tools
                // Stop checking - subsequent tools must maintain order
                break;
            }
            // Concurrent tool blocked by non-concurrent runner
            // Continue checking - subsequent tools might be serial and blocked anyway
        }
    }
    /**
     * Execute a single tool with full error handling
     */
    async executeTool(trackedTool) {
        try {
            // Check if discarded before running
            if (this.discarded) {
                trackedTool.status = 'completed';
                trackedTool.result = {
                    tool_call_id: trackedTool.call.id,
                    content: 'Error: Tool execution discarded due to streaming fallback',
                    isError: true,
                };
                return;
            }
            // Link abort controllers
            trackedTool.abortController.signal.addEventListener('abort', () => {
                // Cancel siblings on certain errors (Bash errors cascade)
                if (trackedTool.call.name === 'Bash') {
                    this.siblingAbortController.abort();
                }
            });
            // Execute via pipeline
            const result = await executeToolPipeline(trackedTool.call, this.context, this.registry);
            trackedTool.result = {
                tool_call_id: trackedTool.call.id,
                content: typeof result.data === 'string' ? result.data : JSON.stringify(result.data),
                isError: false,
            };
            trackedTool.contextModifier = result.contextModifier;
            trackedTool.status = 'completed';
        }
        catch (error) {
            // Handle execution errors
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            // Check if this was a sibling cascade
            if (errorMessage.includes('parallel tool call') && errorMessage.includes('errored')) {
                trackedTool.result = {
                    tool_call_id: trackedTool.call.id,
                    content: `Cancelled: ${errorMessage}`,
                    isError: true,
                };
            }
            else {
                trackedTool.result = {
                    tool_call_id: trackedTool.call.id,
                    content: `Error: ${errorMessage}`,
                    isError: true,
                };
            }
            // Cascade for Bash errors
            if (trackedTool.call.name === 'Bash') {
                this.cancelSiblings(trackedTool);
            }
            trackedTool.status = 'completed';
        }
    }
    /**
     * Cancel sibling tools when a Bash command fails
     *
     * Bash commands often form implicit dependency chains:
     * mkdir build && cp src/* build/ && tar -czf dist.tar.gz build/
     * If mkdir fails, running cp and tar is pointless.
     */
    cancelSiblings(erroredTool) {
        const description = this.getToolDescription(erroredTool.call);
        for (const tool of this.tools) {
            if (tool.status === 'executing' && tool.id !== erroredTool.id) {
                tool.abortController.abort(new Error(`Cancelled: parallel tool call ${description} errored`));
            }
        }
    }
    /**
     * Get a short description of a tool call for error messages
     */
    getToolDescription(call) {
        const input = JSON.stringify(call.input);
        const preview = input.length > 40 ? input.slice(0, 40) + '...' : input;
        return `${call.name}(${preview})`;
    }
    /**
     * Get results that are ready to yield (synchronous, mid-stream)
     *
     * Called between chunks of the streaming API response.
     * Yields results in submission order, breaking if a serial tool is still executing.
     */
    *getCompletedResults() {
        if (this.discarded)
            return;
        for (const tool of this.tools) {
            // Drain progress messages first
            const progress = this.pendingProgress.filter(p => p.toolId === tool.id);
            for (const _ of progress) {
                // Progress would be yielded here
            }
            if (tool.status === 'completed') {
                tool.status = 'yielded';
                if (tool.result) {
                    yield { toolId: tool.id, result: tool.result };
                }
            }
            else if (tool.status === 'executing' && !tool.isConcurrencySafe) {
                // Serial tool still running - stop here
                // Results after this might depend on its context modifications
                break;
            }
            // Concurrent tools executing - skip and continue checking subsequent
        }
    }
    /**
     * Get remaining results after stream completes (async, blocking)
     *
     * Called after the model's response is fully received.
     * Waits for all tools to complete and yields their results.
     */
    async *getRemainingResults() {
        if (this.discarded)
            return;
        const pendingTools = () => this.tools.filter(t => t.status === 'executing');
        while (this.tools.some(t => t.status !== 'yielded')) {
            // Yield any completed results
            yield* this.getCompletedResults();
            // If nothing new completed but tools are still running, wait
            if (pendingTools().length > 0) {
                await Promise.race(pendingTools().map(t => t.promise).filter((p) => p !== undefined));
            }
            else {
                // No tools running, yield remaining completed
                for (const tool of this.tools) {
                    if (tool.status === 'completed' && tool.result) {
                        tool.status = 'yielded';
                        yield { toolId: tool.id, result: tool.result };
                    }
                }
                break;
            }
        }
    }
    /**
     * Discard this executor (e.g., on streaming fallback)
     *
     * Prevents any further tool execution. Results are abandoned.
     */
    discard() {
        this.discarded = true;
        this.siblingAbortController.abort();
    }
    /**
     * Check if this executor has been discarded
     */
    isDiscarded() {
        return this.discarded;
    }
}
//# sourceMappingURL=StreamingToolExecutor.js.map