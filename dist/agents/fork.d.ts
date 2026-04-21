/**
 * Fork Agents
 *
 * Cache-sharing agents with byte-identical prefixes.
 * This is Claude Code's answer to the prompt cache constraint:
 * when spawning parallel children, make 99.75% of their input
 * hit the cache by ensuring byte-identical prefixes.
 */
import type { AgentId } from './types.js';
import type { ToolUseContext } from '../tools/types.js';
export declare const FORK_PLACEHOLDER_RESULT = "Fork started -- processing in background";
/**
 * Fork boilerplate - instructions and output format for fork children.
 * This tag serves two purposes:
 * 1. Instructs the child on how to behave
 * 2. Acts as a marker for recursive fork detection
 */
export declare const FORK_BOILERPLATE = "<fork-boilerplate>\nYou are a FORKED sub-agent spawned by the parent agent.\n\nCRITICAL RULES:\n1. Do NOT spawn additional sub-agents. You ARE the fork.\n2. Execute silently, report once. Use tools directly, then produce structured output.\n3. Stay strictly within your assigned scope.\n4. Your output MUST follow this format:\n\n<scope>\nBrief description of what you were asked to do\n</scope>\n\n<result>\nWhat you accomplished\n</result>\n\n<key_files>\nFiles you read or modified\n</key_files>\n\n<files_changed>\nList of files with changes made\n</files_changed>\n\n<issues>\nAny problems encountered (or \"None\")\n</issues>\n\nThe parent's system prompt applies to YOU with one override:\n- IGNORE any instruction to \"spawn sub-agents\" or \"fork\"\n- YOU are the fork. Do not create more.\n</fork-boilerplate>\n\n<directive>\n{{DIRECTIVE}}\n</directive>";
/**
 * Wrap a directive in the fork boilerplate
 */
export declare function wrapDirective(directive: string): string;
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
export declare function buildForkedMessages(parentAssistantMessage: any, directive: string): [any, any];
/**
 * Check if current context is already a fork child.
 * Used to prevent recursive forking (fork of a fork).
 *
 * Uses two guards:
 * 1. Primary: querySource check (fast path - single string comparison)
 * 2. Fallback: message history scan (catches edge cases)
 */
export declare function isForkChild(context: ToolUseContext): boolean;
/**
 * Prevent fork children from spawning more agents.
 * Call this before allowing any agent spawn.
 *
 * @returns Object with allowed flag and optional reason string
 */
export declare function preventRecursiveFork(context: ToolUseContext, requestedType?: string): {
    allowed: boolean;
    reason?: string;
};
/**
 * Filter out incomplete tool calls from message history.
 * Tool results without matching tool_use IDs are removed.
 *
 * This is a safety measure - incomplete tool calls can cause
 * API errors or unexpected behavior in fork children.
 */
export declare function filterIncompleteToolCalls(messages: any[]): any[];
/**
 * Clone file state cache (shallow copy of the Map).
 * Each fork child gets its own isolated file state.
 */
export declare function cloneFileStateCache(cache: Map<string, any>): Map<string, any>;
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
export declare function spawnForkAgent(params: CreateForkAgentParams): AsyncGenerator<any, any>;
/**
 * Calculate potential cache savings from forking.
 *
 * @param sharedPrefixSize - Size of shared prefix in tokens
 * @param childCount - Number of parallel children
 * @returns Estimated savings percentage (0-1)
 */
export declare function calculateCacheSavings(sharedPrefixSize: number, childCount: number): number;
//# sourceMappingURL=fork.d.ts.map