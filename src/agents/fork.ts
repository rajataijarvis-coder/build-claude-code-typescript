/**
 * Fork Agents
 *
 * Cache-sharing agents with byte-identical prefixes.
 */

import type { AgentDefinition, AgentId } from './types.js';
import type { ToolUseContext } from '../tools/types.js';
import { runAgent } from './runAgent.js';

export interface ForkAgentParams {
  agentDefinition: AgentDefinition;
  prompt: string;
  context: ToolUseContext;
  agentId: AgentId;
  forkContextMessages: any[];
  parentSystemPrompt: string;
  parentTools: any[];
}

/**
 * Create a fork agent
 *
 * Inherits parent's conversation context, system prompt, and tools
 * for byte-identical cache sharing.
 */
export async function* forkAgent(
  params: ForkAgentParams
): AsyncGenerator<any, any> {
  const {
    agentDefinition,
    prompt,
    context,
    agentId,
    forkContextMessages,
    parentSystemPrompt,
    parentTools,
  } = params;

  // Filter incomplete tool calls
  const cleanContext = filterIncompleteToolCalls(forkContextMessages);

  // Clone parent's file state cache
  const forkReadFileState = cloneFileStateCache(context.readFileState);

  // Run with byte-identical parameters
  return yield* runAgent({
    agentDefinition,
    prompt,
    context: {
      ...context,
      options: {
        ...context.options,
        toolSet: parentTools,
      },
      abortController: new AbortController(),
      readFileState: forkReadFileState,
    },
    agentId,
    maxTurns: agentDefinition.maxTurns ?? 25,
  });
}

/**
 * Filter out incomplete tool calls
 */
export function filterIncompleteToolCalls(messages: any[]): any[] {
  const result: any[] = [];
  const pendingToolUses = new Set<string>();

  for (const msg of messages) {
    if (msg.role === 'assistant' && msg.tool_calls) {
      for (const toolCall of msg.tool_calls) {
        pendingToolUses.add(toolCall.id);
      }
      result.push(msg);
    } else if (msg.role === 'tool') {
      pendingToolUses.delete(msg.tool_call_id);
      result.push(msg);
    } else {
      result.push(msg);
    }
  }

  // Strip incomplete tool_use blocks
  return result.map(msg => {
    if (msg.role === 'assistant' && msg.tool_calls) {
      const completeCalls = msg.tool_calls.filter(
        (tc: any) => !pendingToolUses.has(tc.id)
      );

      if (completeCalls.length === 0) {
        const { tool_calls, ...rest } = msg;
        return rest;
      }

      return { ...msg, tool_calls: completeCalls };
    }
    return msg;
  });
}

/**
 * Clone file state cache (shallow copy)
 */
function cloneFileStateCache(
  cache: Map<string, any>
): Map<string, any> {
  return new Map(cache);
}

/**
 * Check if current context is a fork child
 */
export function isForkChild(context: ToolUseContext): boolean {
  if ((context.options as any).querySource === 'agent:builtin:fork') {
    return true;
  }

  return context.messages.some(
    (m: any) => m.content?.includes('<fork-boilerplate>')
  );
}
