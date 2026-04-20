/**
 * Agent Loop - Core Implementation
 * 
 * The async generator that runs every interaction.
 */

import Anthropic from '@anthropic-ai/sdk';
import { 
  Message, 
  ToolCall, 
  ToolResult, 
  LoopParams, 
  LoopState, 
  LoopEvent, 
  TerminalReason 
} from './types.js';
import { executeTool } from '../tools/executor.js';

/**
 * The Agent Loop - Core of Claude Code
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

  console.log(`🚀 Starting agent loop (max ${state.maxTurns} turns)`);

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
        tools: [
          {
            name: 'read_file',
            description: 'Read the contents of a file',
            input_schema: {
              type: 'object',
              properties: {
                file_path: { type: 'string' },
              },
              required: ['file_path'],
            },
          },
          {
            name: 'write_file',
            description: 'Write content to a file',
            input_schema: {
              type: 'object',
              properties: {
                file_path: { type: 'string' },
                content: { type: 'string' },
              },
              required: ['file_path', 'content'],
            },
          },
          {
            name: 'execute_command',
            description: 'Execute a shell command',
            input_schema: {
              type: 'object',
              properties: {
                command: { type: 'string' },
                cwd: { type: 'string' },
              },
              required: ['command'],
            },
          },
        ],
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
      const assistantMessage: Message = {
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

      // Execute tools
      console.log(`🔧 Executing ${toolCalls.length} tool(s)...`);
      const toolResults: ToolResult[] = [];

      for (const toolCall of toolCalls) {
        try {
          const result = await executeTool(toolCall);
          toolResults.push(result);
          yield { type: 'tool_result', result };
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
