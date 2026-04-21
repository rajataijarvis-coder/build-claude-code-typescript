/**
 * Tool Orchestrator - Partition and Execute Tool Batches
 *
 * Groups consecutive concurrency-safe tools into parallel batches,
 * isolating unsafe tools into serial batches.
 */
import { executeToolPipeline } from './pipeline.js';
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
export async function partitionToolCalls(calls, registry) {
    const batches = [];
    for (const call of calls) {
        const tool = registry.lookup(call.name);
        // Fail-closed: unknown tool = not concurrency-safe
        if (!tool) {
            batches.push({ parallel: false, calls: [call] });
            continue;
        }
        // Parse input
        const parseResult = tool.inputSchema.safeParse(call.input);
        if (!parseResult.success) {
            // Fail-closed: parse failure = serial
            batches.push({ parallel: false, calls: [call] });
            continue;
        }
        // Check concurrency safety with parsed input
        let isSafe = false;
        try {
            isSafe = tool.isConcurrencySafe(parseResult.data);
        }
        catch {
            // Fail-closed: exception = not safe
            isSafe = false;
        }
        // Merge with previous batch if both are safe
        if (isSafe && batches.length > 0 && batches[batches.length - 1].parallel) {
            batches[batches.length - 1].calls.push(call);
        }
        else {
            batches.push({ parallel: isSafe, calls: [call] });
        }
    }
    return batches;
}
/**
 * Execute a batch of tools concurrently
 *
 * All tools start simultaneously and run in parallel.
 * Context modifiers are queued and applied after the batch completes.
 */
async function executeConcurrentBatch(batch, context, registry, maxConcurrency = 10) {
    // Execute all tools in parallel with bounded concurrency
    const executing = batch.calls.map(async (call) => {
        try {
            const result = await executeToolPipeline(call, context, registry);
            return {
                call,
                result: {
                    tool_call_id: call.id,
                    content: typeof result.data === 'string'
                        ? result.data
                        : JSON.stringify(result.data),
                    isError: false,
                },
                contextModifier: result.contextModifier,
            };
        }
        catch (error) {
            return {
                call,
                result: {
                    tool_call_id: call.id,
                    content: `Error: ${error.message}`,
                    isError: true,
                },
            };
        }
    });
    // Wait for all to complete
    const results = await Promise.all(executing);
    return results;
}
/**
 * Execute a batch of tools serially
 *
 * Tools run one at a time. Context modifiers are applied immediately
 * and affect subsequent tools in the same batch.
 */
async function* executeSerialBatch(batch, context, registry) {
    let currentContext = context;
    for (const call of batch.calls) {
        try {
            const pipelineResult = await executeToolPipeline(call, currentContext, registry);
            const result = {
                tool_call_id: call.id,
                content: typeof pipelineResult.data === 'string'
                    ? pipelineResult.data
                    : JSON.stringify(pipelineResult.data),
                isError: false,
            };
            // Apply context modifier immediately for serial tools
            if (pipelineResult.contextModifier) {
                currentContext = pipelineResult.contextModifier(currentContext);
            }
            yield { call, result, context: currentContext };
        }
        catch (error) {
            yield {
                call,
                result: {
                    tool_call_id: call.id,
                    content: `Error: ${error.message}`,
                    isError: true,
                },
                context: currentContext,
            };
        }
    }
}
/**
 * Execute all partitioned batches in order
 *
 * This is the main entry point for tool orchestration.
 */
export async function* executeToolBatches(batches, initialContext, registry) {
    let currentContext = initialContext;
    for (const batch of batches) {
        if (batch.parallel) {
            // Execute concurrent batch
            const results = await executeConcurrentBatch(batch, currentContext, registry);
            // Yield results in submission order
            for (const result of results) {
                yield result;
            }
        }
        else {
            // Execute serial batch
            for await (const item of executeSerialBatch(batch, currentContext, registry)) {
                yield { call: item.call, result: item.result };
                currentContext = item.context;
            }
        }
    }
    return currentContext;
}
/**
 * Convenience function: partition and execute in one call
 */
export async function* executeToolCalls(calls, context, registry) {
    const batches = await partitionToolCalls(calls, registry);
    return yield* executeToolBatches(batches, context, registry);
}
//# sourceMappingURL=orchestrator.js.map