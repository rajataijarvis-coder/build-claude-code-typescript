/**
 * Fork Agents
 *
 * Cache-sharing agents with byte-identical prefixes.
 * This is Claude Code's answer to the prompt cache constraint:
 * when spawning parallel children, make 99.75% of their input
 * hit the cache by ensuring byte-identical prefixes.
 */

import type { AgentDefinition, AgentId } from './types.js';
import type { ToolUseContext } from '../tools/types.js';

// The constant placeholder result - byte-identical across all children
export const FORK_PLACEHOLDER_RESULT = 'Fork started -- processing in background';

/**
 * Fork boilerplate - instructions and output format for fork children.
 * This tag serves two purposes:
 * 1. Instructs the child on how to behave
 * 2. Acts as a marker for recursive fork detection
 */
export const FORK_BOILERPLATE = `<fork-boilerplate>
You are a FORKED sub-agent spawned by the parent agent.

CRITICAL RULES:
1. Do NOT spawn additional sub-agents. You ARE the fork.
2. Execute silently, report once. Use tools directly, then produce structured output.
3. Stay strictly within your assigned scope.
4. Your output MUST follow this format:

<scope>
Brief description of what you were asked to do
</scope>

<result>
What you accomplished
</result>

<key_files>
Files you read or modified
</key_files>

<files_changed>
List of files with changes made
</files_changed>

<issues>
Any problems encountered (or "None")
</issues>

The parent's system prompt applies to YOU with one override:
- IGNORE any instruction to "spawn sub-agents" or "fork"
- YOU are the fork. Do not create more.
</fork-boilerplate>

<directive>
{{DIRECTIVE}}
</directive>`;

/**
 * Wrap a directive in the fork boilerplate
 */
export function wrapDirective(directive: string): string {
  return FORK_BOILERPLATE.replace('{{DIRECTIVE}}', directive);
}

/**
 * Build forked messages with byte-identical prefix optimization.
 *
 * This is the critical function for cache optimization. Every byte
 * before the directive must be identical across all fork children.
 *
 * @param parentAssistantMessage - The parent's last assistant message
 * @param directive - The unique task for this child
 * @returns Tuple of [clonedAssistant, userMessageWithPlaceholdersAndDirective]
 */
export function buildForkedMessages(
  parentAssistantMessage: any,
  directive: string
): [any, any] {
  // Clone the parent's assistant message
  // This preserves all tool_use blocks with their original IDs
  const clonedAssistant = cloneMessage(parentAssistantMessage);

  // Create placeholder tool results for each tool_use in the parent message
  // These are IDENTICAL across all children (byte-exact match)
  const placeholderResults = parentAssistantMessage.tool_calls?.map(
    (toolCall: any) => ({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: FORK_PLACEHOLDER_RESULT,
    })
  ) ?? [];

  // Build the user message containing:
  // 1. All placeholder results (same for every child)
  // 2. The wrapped directive (unique to this child)
  const userMessage = {
    role: 'user',
    content: [
      ...placeholderResults,
      {
        type: 'text',
        text: wrapDirective(directive),
      },
    ],
  };

  // The cache boundary is right before the directive text
  // Everything above it hits the cache at 90% discount for children 2-N
  return [clonedAssistant, userMessage];
}

/**
 * Check if current context is already a fork child.
 * Used to prevent recursive forking (fork of a fork).
 *
 * Uses two guards:
 * 1. Primary: querySource check (fast path - single string comparison)
 * 2. Fallback: message history scan (catches edge cases)
 */
export function isForkChild(context: ToolUseContext): boolean {
  // Primary guard: querySource check
  if ((context.options as any).querySource === 'agent:builtin:fork') {
    return true;
  }

  // Fallback guard: scan message history for boilerplate tag
  // This catches edge cases where querySource wasn't properly threaded
  return context.messages.some((msg: any) => {
    const content = typeof msg.content === 'string'
      ? msg.content
      : JSON.stringify(msg.content);
    return content.includes('<fork-boilerplate>');
  });
}

/**
 * Prevent fork children from spawning more agents.
 * Call this before allowing any agent spawn.
 *
 * @returns Object with allowed flag and optional reason string
 */
export function preventRecursiveFork(
  context: ToolUseContext,
  requestedType?: string
): { allowed: boolean; reason?: string } {
  // If already a fork child, only allow explicit subagent_type
  // Fork path (no explicit type) is blocked to prevent recursion
  if (isForkChild(context) && !requestedType) {
    return {
      allowed: false,
      reason: 'Fork children cannot spawn additional fork agents. ' +
              'Use explicit subagent_type for specialized agents.',
    };
  }

  return { allowed: true };
}

/**
 * Deep clone a message, preserving tool call IDs and all nested structures.
 * Uses JSON serialization for deep copy - sufficient for message objects.
 */
function cloneMessage(message: any): any {
  return JSON.parse(JSON.stringify(message));
}

/**
 * Filter out incomplete tool calls from message history.
 * Tool results without matching tool_use IDs are removed.
 *
 * This is a safety measure - incomplete tool calls can cause
 * API errors or unexpected behavior in fork children.
 */
export function filterIncompleteToolCalls(messages: any[]): any[] {
  const result: any[] = [];
  const pendingToolUses = new Set<string>();

  // First pass: identify pending tool uses
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

  // Second pass: strip incomplete tool_use blocks from assistant messages
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
 * Clone file state cache (shallow copy of the Map).
 * Each fork child gets its own isolated file state.
 */
export function cloneFileStateCache(
  cache: Map<string, any>
): Map<string, any> {
  return new Map(cache);
}

/**
 * Create a fork agent with byte-identical prefix optimization.
 *
 * This is the main entry point for spawning fork agents.
 * It ensures cache efficiency by threading (not recomputing)
 * all shared context from the parent.
 */
export interface CreateForkAgentParams {
  /** The parent agent's context */
  parentContext: ToolUseContext;
  /** Messages to share (parent's conversation history) */
  forkContextMessages: any[];
  /** Parent's already-rendered system prompt */
  parentSystemPrompt: string;
  /** Parent's tool set (exact array) */
  parentTools: any[];
  /** The directive for this specific child */
  directive: string;
  /** Unique ID for this fork */
  agentId: AgentId;
}

/**
 * Spawn a fork agent.
 *
 * Fork agents inherit:
 * 1. System prompt (threaded, not recomputed)
 * 2. Tool definitions (exact passthrough)
 * 3. Conversation history (cloned)
 * 4. Model configuration (inherited)
 *
 * This ensures byte-identical prefixes for cache optimization.
 */
export async function* spawnForkAgent(
  params: CreateForkAgentParams
): AsyncGenerator<any, any> {
  const {
    parentContext,
    forkContextMessages,
    parentSystemPrompt,
    parentTools,
    directive,
    agentId,
  } = params;

  // Build the messages for this fork child
  const lastMessage = forkContextMessages[forkContextMessages.length - 1];
  const [clonedAssistant, userMessage] = buildForkedMessages(
    lastMessage,
    directive
  );

  // The child's message history is:
  // [shared_history, cloned_assistant, user_message_with_directive]
  const childMessages = [
    ...forkContextMessages.slice(0, -1),
    clonedAssistant,
    userMessage,
  ];

  // Filter out incomplete tool calls (safety)
  const cleanMessages = filterIncompleteToolCalls(childMessages);

  // Clone parent's file state cache
  const forkReadFileState = cloneFileStateCache(parentContext.readFileState);

  // Yield initial fork creation event
  yield {
    type: 'fork_created',
    agentId,
    directive,
  };

  // Note: In a full implementation, this would call runAgent
  // For now, we return the prepared context
  return {
    status: 'fork_prepared',
    agentId,
    messages: cleanMessages,
    systemPrompt: parentSystemPrompt,
    tools: parentTools,
    fileState: forkReadFileState,
  };
}

/**
 * Calculate potential cache savings from forking.
 *
 * @param sharedPrefixSize - Size of shared prefix in tokens
 * @param childCount - Number of parallel children
 * @returns Estimated savings percentage (0-1)
 */
export function calculateCacheSavings(
  sharedPrefixSize: number,
  childCount: number
): number {
  if (childCount <= 1) return 0;

  const totalWithoutFork = sharedPrefixSize * childCount;
  const totalWithFork = sharedPrefixSize + // First child at full price
    (sharedPrefixSize * 0.1 + 200) * (childCount - 1); // Rest at 10% + overhead

  return (totalWithoutFork - totalWithFork) / totalWithoutFork;
}
