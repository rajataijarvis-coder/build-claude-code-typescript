/**
 * Agent Loop - Core Implementation with Concurrent Execution
 *
 * The async generator that runs every interaction.
 * Now uses speculative execution and partition-based tool orchestration.
 */
import Anthropic from '@anthropic-ai/sdk';
import { toolRegistry, getAllBaseTools, StreamingToolExecutor, executeToolCalls, } from '../tools/index.js';
/**
 * Convert agent messages to tool messages
 */
function toToolMessages(messages) {
    return messages.map(m => ({
        ...m,
        role: m.role === 'tool' ? 'tool' : m.role === 'assistant' ? 'assistant' : 'user',
    }));
}
/**
 * Build ToolUseContext for the agent loop
 */
async function buildToolContext(workingDirectory, options) {
    return {
        options,
        abortController: new AbortController(),
        readFileState: new Map(),
        messages: [],
        workingDirectory,
        permissionMode: 'default',
        alwaysAllowRules: [],
        alwaysDenyRules: [],
        alwaysAskRules: [],
    };
}
/**
 * Convert tool definitions to Anthropic tool format
 */
async function getAnthropicTools(registry) {
    const baseTools = await getAllBaseTools();
    // Register all tools
    for (const tool of baseTools) {
        registry.register(tool);
    }
    return baseTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: zodToJsonSchema(tool.inputSchema),
    }));
}
/**
 * Simple Zod to JSON Schema converter
 */
function zodToJsonSchema(schema) {
    // In production, use zod-to-json-schema package
    // This is a simplified version for the tutorial
    return {
        type: 'object',
        properties: {},
        required: [],
    };
}
/**
 * The Agent Loop with Concurrent Execution
 *
 * Supports two modes:
 * 1. Streaming mode: Uses StreamingToolExecutor for speculative execution
 * 2. Batch mode: Uses partition-based orchestrator for pre-known tool sets
 */
export async function* agentLoop(params, useStreaming = true) {
    const state = {
        messages: [...params.messages],
        turnCount: 0,
        maxTurns: params.maxTurns ?? 25,
    };
    const anthropic = new Anthropic({
        apiKey: params.apiKey,
    });
    // Build tool context
    const toolContext = await buildToolContext(process.cwd(), {
        toolSet: [],
        model: params.model ?? 'claude-3-5-sonnet-20241022',
        debug: false,
    });
    // Get tools
    const tools = await getAnthropicTools(toolRegistry);
    console.log(`🚀 Starting agent loop (max ${state.maxTurns} turns)`);
    console.log(`📦 Loaded ${tools.length} tools`);
    console.log(`⚡ Concurrent execution: ${useStreaming ? 'streaming' : 'batch'}`);
    while (state.turnCount < state.maxTurns) {
        state.turnCount++;
        console.log(`\n--- Turn ${state.turnCount}/${state.maxTurns} ---`);
        try {
            if (useStreaming) {
                // Streaming mode with speculative execution
                yield* runWithStreaming(state, anthropic, tools, toolContext, params);
            }
            else {
                // Batch mode with partition algorithm
                yield* runWithBatching(state, anthropic, tools, toolContext, params);
            }
        }
        catch (error) {
            console.error('❌ Error in agent loop:', error);
            return {
                reason: 'error',
                error: error.message
            };
        }
    }
    return { reason: 'max_turns_reached' };
}
/**
 * Streaming mode: Tools execute while response streams
 */
async function* runWithStreaming(state, anthropic, tools, toolContext, params) {
    // Create streaming executor
    const executor = new StreamingToolExecutor(toolContext, toolRegistry);
    let streamError = null;
    // Start streaming
    const stream = anthropic.messages.stream({
        model: params.model ?? 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: params.systemPrompt,
        messages: state.messages.map(m => ({
            role: m.role === 'tool' ? 'user' : m.role,
            content: m.content,
        })),
        tools: tools,
    });
    let assistantContent = '';
    const toolCalls = [];
    try {
        // Stream the response
        for await (const event of stream) {
            switch (event.type) {
                case 'content_block_delta':
                    if (event.delta.type === 'text_delta') {
                        const text = event.delta.text;
                        assistantContent += text;
                        yield { type: 'assistant_message', content: text };
                    }
                    break;
                case 'content_block_start':
                    if (event.content_block.type === 'tool_use') {
                        const toolCall = {
                            id: event.content_block.id,
                            name: event.content_block.name,
                            input: event.content_block.input,
                        };
                        toolCalls.push(toolCall);
                        yield { type: 'tool_call', tool: toolCall };
                        // Add to executor for speculative execution
                        executor.addTool({
                            id: event.content_block.id,
                            name: event.content_block.name,
                            input: event.content_block.input,
                        }, { content: assistantContent });
                    }
                    break;
            }
            // Check for completed tools mid-stream
            for (const { toolId, result } of executor.getCompletedResults()) {
                yield { type: 'tool_result', result };
            }
        }
    }
    catch (error) {
        streamError = error;
        executor.discard();
    }
    // Stream complete - collect remaining results
    const toolResults = [];
    if (!streamError) {
        for await (const { result } of executor.getRemainingResults()) {
            toolResults.push(result);
            yield { type: 'tool_result', result };
        }
    }
    // Add messages to state
    const assistantMessage = {
        role: 'assistant',
        content: assistantContent,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    };
    state.messages.push(assistantMessage);
    for (const result of toolResults) {
        state.messages.push({
            role: 'tool',
            content: result.content,
            tool_call_id: result.tool_call_id,
        });
    }
    // Check completion
    if (toolCalls.length === 0) {
        console.log('✅ No tool calls - task complete');
        return;
    }
    if (streamError) {
        throw streamError;
    }
    console.log('🔄 Continuing to next turn...');
}
/**
 * Batch mode: Wait for full response, then partition and execute
 */
async function* runWithBatching(state, anthropic, tools, toolContext, params) {
    // Get full response (non-streaming)
    const response = await anthropic.messages.create({
        model: params.model ?? 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: params.systemPrompt,
        messages: state.messages.map(m => ({
            role: m.role === 'tool' ? 'user' : m.role,
            content: m.content,
        })),
        tools: tools,
    });
    // Extract content and tool calls
    let assistantContent = '';
    const toolCalls = [];
    for (const block of response.content) {
        if (block.type === 'text') {
            assistantContent += block.text;
            yield { type: 'assistant_message', content: block.text };
        }
        else if (block.type === 'tool_use') {
            const toolCall = {
                id: block.id,
                name: block.name,
                input: block.input,
            };
            toolCalls.push(toolCall);
            yield { type: 'tool_call', tool: toolCall };
        }
    }
    // Execute tools using partition algorithm
    const toolResults = [];
    if (toolCalls.length > 0) {
        console.log(`🔧 Executing ${toolCalls.length} tool(s) via partition algorithm...`);
        const generator = executeToolCalls(toolCalls, toolContext, toolRegistry);
        for await (const { result } of generator) {
            toolResults.push(result);
            yield { type: 'tool_result', result };
        }
    }
    // Add messages to state
    const assistantMessage = {
        role: 'assistant',
        content: assistantContent,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    };
    state.messages.push(assistantMessage);
    for (const result of toolResults) {
        state.messages.push({
            role: 'tool',
            content: result.content,
            tool_call_id: result.tool_call_id,
        });
    }
    if (toolCalls.length === 0) {
        console.log('✅ No tool calls - task complete');
        return;
    }
    console.log('🔄 Continuing to next turn...');
}
//# sourceMappingURL=loop.js.map