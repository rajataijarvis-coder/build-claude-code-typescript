/**
 * Async Agent Manager
 *
 * Handles background execution and result retrieval.
 */

import { EventEmitter } from 'events';
import type { AgentDefinition, AgentId } from './types.js';
import type { ToolUseContext } from '../tools/types.js';
import { runAgent } from './runAgent.js';
import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';

interface AgentHandle {
  agentId: AgentId;
  startTime: number;
  abortController: AbortController;
}

interface CompletedAgent {
  agentId: AgentId;
  startTime: number;
  endTime: number;
  events: any[];
  result: any;
  error: Error | null;
  outputFile: string;
}

/**
 * Background agent manager
 */
export class AsyncAgentManager extends EventEmitter {
  private runningAgents = new Map<AgentId, AgentHandle>();
  private completedAgents = new Map<AgentId, CompletedAgent>();

  /**
   * Launch an agent in the background
   */
  async launch(
    agentDef: AgentDefinition,
    prompt: string,
    context: ToolUseContext,
    agentId: AgentId,
    outputFile: string
  ): Promise<void> {
    const handle: AgentHandle = {
      agentId,
      startTime: Date.now(),
      abortController: new AbortController(),
    };

    this.runningAgents.set(agentId, handle);

    // Run the agent lifecycle
    const generator = runAgent({
      agentDefinition: agentDef,
      prompt,
      context,
      agentId,
      isAsync: true,
    });

    // Consume in background
    this.consumeInBackground(generator, agentId, outputFile);

    this.emit('launched', { agentId, description: agentDef.name });
  }

  /**
   * Consume the generator in background
   */
  private async consumeInBackground(
    generator: AsyncGenerator<any, any>,
    agentId: AgentId,
    outputFile: string
  ): Promise<void> {
    const events: any[] = [];
    let result: any;
    let error: Error | null = null;

    try {
      for await (const event of generator) {
        events.push(event);
        this.emit('progress', { agentId, event });
      }
    } catch (err) {
      error = err as Error;
    }

    const handle = this.runningAgents.get(agentId);
    if (handle) {
      this.runningAgents.delete(agentId);

      const completed: CompletedAgent = {
        agentId,
        startTime: handle.startTime,
        endTime: Date.now(),
        events,
        result,
        error,
        outputFile,
      };

      this.completedAgents.set(agentId, completed);
      await this.writeResults(completed);
      this.emit('completed', { agentId, outputFile });
    }
  }

  /**
   * Write agent results to output file
   */
  private async writeResults(completed: CompletedAgent): Promise<void> {
    const data = JSON.stringify({
      agentId: completed.agentId,
      startTime: completed.startTime,
      endTime: completed.endTime,
      duration: completed.endTime - completed.startTime,
      events: completed.events,
      result: completed.result,
      error: completed.error?.message,
    }, null, 2);

    await mkdir(dirname(completed.outputFile), { recursive: true });
    await writeFile(completed.outputFile, data);
  }

  /**
   * Get results for a completed agent
   */
  async getResults(agentId: AgentId): Promise<any> {
    const completed = this.completedAgents.get(agentId);
    if (!completed) {
      throw new Error(`No results found for agent ${agentId}`);
    }

    // Read from file for durability
    const fs = await import('fs/promises');
    const content = await fs.readFile(completed.outputFile, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Abort a running background agent
   */
  abort(agentId: AgentId): boolean {
    const handle = this.runningAgents.get(agentId);
    if (handle) {
      handle.abortController.abort();
      return true;
    }
    return false;
  }

  /**
   * List all running agents
   */
  getRunningAgents(): AgentId[] {
    return Array.from(this.runningAgents.keys());
  }

  /**
   * Check if an agent is still running
   */
  isRunning(agentId: AgentId): boolean {
    return this.runningAgents.has(agentId);
  }
}

// Singleton instance
export const asyncAgentManager = new AsyncAgentManager();
