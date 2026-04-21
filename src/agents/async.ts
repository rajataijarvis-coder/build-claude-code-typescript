/**
 * Async Agent Management
 *
 * Handles background agents, sync-to-async transitions,
 * and automatic backgrounding of long-running tasks.
 */

import type { AgentDefinition, AgentId, AgentResult } from './types.js';
import type { ToolUseContext } from '../tools/types.js';
import { join } from 'path';
import { homedir } from 'os';
import { mkdir, writeFile } from 'fs/promises';

// Signal for background transition
export const BACKGROUND_SIGNAL = Symbol('BACKGROUND_SIGNAL');

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
export class AsyncAgentManager {
  private agents = new Map<AgentId, BackgroundAgent>();
  private outputDir: string;

  constructor() {
    this.outputDir = join(homedir(), '.claude', 'agents');
  }

  /**
   * Launch an agent in the background
   */
  async launch(
    agentDefinition: AgentDefinition,
    prompt: string,
    parentContext: ToolUseContext,
    agentId: AgentId,
    outputFile: string
  ): Promise<void> {
    // Ensure output directory exists
    await mkdir(this.outputDir, { recursive: true });

    const agent: BackgroundAgent = {
      agentId,
      agentDefinition,
      prompt,
      status: 'running',
      outputFile,
      startTime: Date.now(),
    };

    this.agents.set(agentId, agent);

    // In a real implementation, this would spawn a separate process
    // or worker thread. For now, we just record the launch.
    console.log(`[AsyncAgent] Launched ${agentId} for: ${prompt.slice(0, 50)}...`);

    // Write initial state to output file
    await writeFile(
      outputFile,
      JSON.stringify({
        agentId,
        status: 'running',
        startTime: agent.startTime,
        prompt: prompt.slice(0, 200),
      }, null, 2)
    );
  }

  /**
   * Get status of a background agent
   */
  getStatus(agentId: AgentId): BackgroundAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * List all running background agents
   */
  listRunning(): BackgroundAgent[] {
    return Array.from(this.agents.values()).filter(
      a => a.status === 'running'
    );
  }

  /**
   * Mark an agent as complete
   */
  async complete(agentId: AgentId, result: AgentResult): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.status = 'completed';
    agent.endTime = Date.now();
    agent.result = result;

    await writeFile(
      agent.outputFile,
      JSON.stringify({
        agentId,
        status: 'completed',
        startTime: agent.startTime,
        endTime: agent.endTime,
        result: result.content.slice(0, 500),
        success: result.success,
      }, null, 2)
    );
  }
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

// Singleton instance
export const asyncAgentManager = new AsyncAgentManager();

/**
 * Create a background signal promise for auto-backgrounding.
 *
 * When the timeout fires, the signal resolves and triggers
 * a sync-to-async transition.
 *
 * @param timeoutMs - Timeout in milliseconds (default: 2 minutes)
 */
export function createBackgroundSignal(
  timeoutMs: number = 120000
): Promise<typeof BACKGROUND_SIGNAL> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(BACKGROUND_SIGNAL), timeoutMs);
  });
}

/**
 * Check if auto-backgrounding is enabled.
 *
 * Controlled via CLAUDE_AUTO_BACKGROUND_TASKS env var
 * or tengu_auto_background_agents feature flag.
 */
export function isAutoBackgroundEnabled(): boolean {
  // Check environment variable
  if (process.env.CLAUDE_AUTO_BACKGROUND_TASKS === 'true') {
    return true;
  }

  if (process.env.CLAUDE_AUTO_BACKGROUND_TASKS === 'false') {
    return false;
  }

  // Check feature flag (would be implemented via GrowthBook in real system)
  // For now, default to true for demonstration
  return true;
}

/**
 * Get the auto-background timeout in milliseconds.
 *
 * Returns 0 if auto-backgrounding is disabled.
 */
export function getAutoBackgroundTimeout(): number {
  if (!isAutoBackgroundEnabled()) {
    return 0;
  }

  // Default 2 minutes
  const envTimeout = process.env.CLAUDE_AUTO_BACKGROUND_TIMEOUT;
  if (envTimeout) {
    const parsed = parseInt(envTimeout, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed * 1000; // Convert seconds to ms
    }
  }

  return 120000; // 2 minutes default
}

/**
 * Race between agent progress and background signal.
 *
 * When the background signal fires, gracefully terminate the
 * foreground agent and spawn an async continuation.
 *
 * @param agentGenerator - The agent's message generator
 * @param transition - Transition state and signal
 */
export async function* runWithAutoBackground<T>(
  agentGenerator: AsyncGenerator<any, T>,
  transition: SyncToAsyncTransition
): AsyncGenerator<any, T | { status: 'async_launched' }> {
  const iterator = agentGenerator[Symbol.asyncIterator]();

  try {
    while (true) {
      // Race between next message and background signal
      const result = await Promise.race([
        iterator.next(),
        transition.backgroundSignal,
      ]);

      // Background signal fired - transition to async
      if (result === BACKGROUND_SIGNAL) {
        // Gracefully terminate foreground iterator
        await iterator.return?.({ status: 'async_launched' } as T);

        // Yield transition event
        yield {
          type: 'background_transition',
          messages: transition.currentMessages,
          transcriptFile: transition.transcriptFile,
        };

        // Return async status
        return { status: 'async_launched' } as any;
      }

      // Normal message from agent
      if (result.done) {
        return result.value;
      }

      yield result.value;
    }
  } finally {
    // Cleanup - iterator.return is optional
    if (iterator.return) {
      await iterator.return({} as T);
    }
  }
}

/**
 * Register a foreground agent for potential backgrounding.
 *
 * Creates the background signal and sets up the transition state.
 *
 * @param agentId - The agent's ID
 * @param initialMessages - Starting message history
 * @returns Transition state for use with runWithAutoBackground
 */
export function registerForegroundAgent(
  agentId: AgentId,
  initialMessages: any[]
): SyncToAsyncTransition {
  const transcriptFile = join(
    homedir(),
    '.claude',
    'agents',
    `${agentId}-transcript.json`
  );

  return {
    backgroundSignal: createBackgroundSignal(getAutoBackgroundTimeout()),
    currentMessages: [...initialMessages],
    transcriptFile,
  };
}
