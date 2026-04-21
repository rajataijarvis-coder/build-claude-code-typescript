/**
 * Async Agent Management
 *
 * Handles background agents, sync-to-async transitions,
 * and automatic backgrounding of long-running tasks.
 */
import type { AgentDefinition, AgentId, AgentResult } from './types.js';
import type { ToolUseContext } from '../tools/types.js';
export declare const BACKGROUND_SIGNAL: unique symbol;
/**
 * Sync-to-async transition state
 */
export interface SyncToAsyncTransition {
    /** Signal to trigger backgrounding */
    backgroundSignal: Promise<typeof BACKGROUND_SIGNAL>;
    /** Current message history (state) */
    currentMessages: any[];
    /** Sidechain transcript file */
    transcriptFile: string;
}
/**
 * Background agent manager
 */
export declare class AsyncAgentManager {
    private agents;
    private outputDir;
    constructor();
    /**
     * Launch an agent in the background
     */
    launch(agentDefinition: AgentDefinition, prompt: string, parentContext: ToolUseContext, agentId: AgentId, outputFile: string): Promise<void>;
    /**
     * Get status of a background agent
     */
    getStatus(agentId: AgentId): BackgroundAgent | undefined;
    /**
     * List all running background agents
     */
    listRunning(): BackgroundAgent[];
    /**
     * Mark an agent as complete
     */
    complete(agentId: AgentId, result: AgentResult): Promise<void>;
}
/**
 * Background agent record
 */
interface BackgroundAgent {
    agentId: AgentId;
    agentDefinition: AgentDefinition;
    prompt: string;
    status: 'running' | 'completed' | 'failed';
    outputFile: string;
    startTime: number;
    endTime?: number;
    result?: AgentResult;
    error?: string;
}
export declare const asyncAgentManager: AsyncAgentManager;
/**
 * Create a background signal promise for auto-backgrounding.
 *
 * When the timeout fires, the signal resolves and triggers
 * a sync-to-async transition.
 *
 * @param timeoutMs - Timeout in milliseconds (default: 2 minutes)
 */
export declare function createBackgroundSignal(timeoutMs?: number): Promise<typeof BACKGROUND_SIGNAL>;
/**
 * Check if auto-backgrounding is enabled.
 *
 * Controlled via CLAUDE_AUTO_BACKGROUND_TASKS env var
 * or tengu_auto_background_agents feature flag.
 */
export declare function isAutoBackgroundEnabled(): boolean;
/**
 * Get the auto-background timeout in milliseconds.
 *
 * Returns 0 if auto-backgrounding is disabled.
 */
export declare function getAutoBackgroundTimeout(): number;
/**
 * Race between agent progress and background signal.
 *
 * When the background signal fires, gracefully terminate the
 * foreground agent and spawn an async continuation.
 *
 * @param agentGenerator - The agent's message generator
 * @param transition - Transition state and signal
 */
export declare function runWithAutoBackground<T>(agentGenerator: AsyncGenerator<any, T>, transition: SyncToAsyncTransition): AsyncGenerator<any, T | {
    status: 'async_launched';
}>;
/**
 * Register a foreground agent for potential backgrounding.
 *
 * Creates the background signal and sets up the transition state.
 *
 * @param agentId - The agent's ID
 * @param initialMessages - Starting message history
 * @returns Transition state for use with runWithAutoBackground
 */
export declare function registerForegroundAgent(agentId: AgentId, initialMessages: any[]): SyncToAsyncTransition;
export {};
//# sourceMappingURL=async.d.ts.map