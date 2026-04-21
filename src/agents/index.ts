/**
 * Agents Module
 *
 * Sub-agent system for multi-agent workflows.
 */

export * from './types.js';
export * from './runAgent.js';
export * from './builtins.js';
export * from './registry.js';
export { createAgentTool } from './tool.js';
export { AsyncAgentManager, asyncAgentManager } from './async.js';
export {
  FORK_PLACEHOLDER_RESULT,
  FORK_BOILERPLATE,
  wrapDirective,
  buildForkedMessages,
  isForkChild,
  preventRecursiveFork,
  filterIncompleteToolCalls,
  cloneFileStateCache,
  spawnForkAgent,
  calculateCacheSavings,
  type CreateForkAgentParams,
} from './fork.js';

import { agentRegistry } from './registry.js';

/**
 * Initialize the agent subsystem
 */
export async function initializeAgents(projectRoot: string): Promise<void> {
  await agentRegistry.initialize(projectRoot);
}
