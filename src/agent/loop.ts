/**
 * Agent Loop - Core Implementation
 *
 * The async generator that runs every interaction.
 * Now integrated with the full Tool System.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  Message as AgentMessage,
  ToolCall,
  ToolResult,
  LoopParams,
  LoopState,
  LoopEvent,
  TerminalReason
} from './types.js';
import {
  executeToolPipeline,
  ToolRegistry,
  toolRegistry,
  ToolUseContext,
  getAllBaseTools,
} from '../tools/index.js';

// Map agent message type to tool message type
interface ToolMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

/**
 * Convert agent messages to tool messages
 */
function toToolMessages(messages: AgentMessage[]): ToolMessage[] {
  return messages.map(m => ({
    ...m,
    role: m.role === 'tool' ? 'tool' : m.role === 'assistant' ? 'assistant' : 'user',
  }));
}

/**
 * Build ToolUseContext for the agent loop
 */
async function buildToolContext(
  workingDirectory: string,
  options: ToolUseContext['options']
): Promise<ToolUseContext> {
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
 * Anthropic tool type
 */
interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

/**
 * Convert tool definitions to Anthropic tool format
 */
async function getAnthropicTools(registry: ToolRegistry): Promise<AnthropicTool[]> {
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
function zodToJsonSchema(schema: unknown): AnthropicTool['input_schema'] {
  // In production, use zod-to-json-schema package
  // This is a simplified version for the tutorial
  return {
    type: 'object',
    properties: {},
    required: [],
  };
}

/**
 * The Agent Loop - Core of Claude Code
 *
 * Now uses the 14-step tool execution pipeline for all tool calls.
 */
export async function* agentLoop(
  params: LoopParams
): AsyncGenerator<LoopEvent, TerminalReason> {
  const state: LoopState = {
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

  while (state.turnCount < state.maxTurns) {
    state.turnCount++;
    console.log(`\n--- Turn ${state.turnCount}/${state.maxTurns} ---`);

    try {
      // Call the model with streaming
      const stream = anthropic.messages.stream({
        model: params.model ?? 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: params.systemPrompt,
        messages: state.messages.map(m => ({
          role: m.role === 'tool' ? 'user' : m.role,
          content: m.content,
        })),
        tools: tools as unknown as Anthropic.Tool[],
      });

      let assistantContent = '';
      const toolCalls: ToolCall[] = [];

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
              const toolCall: ToolCall = {
                id: event.content_block.id,
                name: event.content_block.name,
                input: event.content_block.input as Record<string, unknown>,
              };
              toolCalls.push(toolCall);
              yield { type: 'tool_call', tool: toolCall };
            }
            break;
        }
      }

      // Add assistant message to history
      const assistantMessage: AgentMessage = {
        role: 'assistant',
        content: assistantContent,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      };
      state.messages.push(assistantMessage);

      // No tool calls = done
      if (toolCalls.length === 0) {
        console.log('✅ No tool calls - task complete');
        return {
          reason: 'completed',
          message: assistantContent
        };
      }

      // Execute tools using the 14-step pipeline
      console.log(`🔧 Executing ${toolCalls.length} tool(s) via pipeline...`);
      const toolResults: ToolResult[] = [];

      for (const toolCall of toolCalls) {
        try {
          // Use the new 14-step pipeline
          const result = await executeToolPipeline(
            toolCall,
            toolContext,
            toolRegistry
          );

          // Extract tool result in the expected format
          const toolResult: ToolResult = {
            tool_call_id: toolCall.id,
            content: typeof result.data === 'string' ? result.data : JSON.stringify(result.data),
            isError: typeof result.data === 'string' && result.data.startsWith('Error:'),
          };

          toolResults.push(toolResult);
          yield { type: 'tool_result', result: toolResult };
        } catch (error) {
          const errorResult: ToolResult = {
            tool_call_id: toolCall.id,
            content: `Error: ${(error as Error).message}`,
            isError: true,
          };
          toolResults.push(errorResult);
          yield { type: 'tool_result', result: errorResult };
        }
      }

      // Add tool results to conversation
      for (const result of toolResults) {
        state.messages.push({
          role: 'tool',
          content: result.content,
          tool_call_id: result.tool_call_id,
        });
      }

      console.log('🔄 Continuing to next turn...');

    } catch (error) {
      console.error('❌ Error in agent loop:', error);
      return {
        reason: 'error',
        error: (error as Error).message
      };
    }
  }

  return { reason: 'max_turns_reached' };
}
