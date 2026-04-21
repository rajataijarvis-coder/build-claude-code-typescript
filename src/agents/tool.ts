/**
 * Agent Tool
 * 
 * The model-facing interface for spawning sub-agents.
 */

import { z } from 'zod';
import { buildTool } from '../tools/buildTool.js';
import { runAgent } from './runAgent.js';
import type { ToolUseContext } from '../tools/types.js';
import type { AgentInput, AgentOutput, AgentId } from './types.js';
import { agentRegistry } from './registry.js';
import { createAgentId } from './types.js';
import { asyncAgentManager } from './async.js';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Build the agent tool input schema
 */
export function buildAgentSchema(options: {
  multiAgentEnabled: boolean;
  isolationEnabled: boolean;
  backgroundEnabled: boolean;
}): z.ZodType {
  let schema: any = z.object({
    description: z.string().describe('Short 3-5 word summary of the task'),
    prompt: z.string().describe('Full task description for the agent'),
    subagent_type: z.enum(['general-purpose', 'explore', 'plan', 'verification', 'guide', 'statusline']).optional(),
    model: z.enum(['sonnet', 'opus', 'haiku']).optional(),
    run_in_background: z.boolean().optional(),
  });

  if (options.multiAgentEnabled) {
    schema = schema.merge(z.object({
      name: z.string().optional(),
      team_name: z.string().optional(),
      mode: z.enum(['ask', 'acceptEdits', 'auto', 'bubble']).optional(),
    }));
  }

  if (options.isolationEnabled) {
    schema = schema.merge(z.object({
      isolation: z.enum(['worktree', 'remote']).optional(),
      cwd: z.string().optional(),
    }));
  }

  return schema;
}

/**
 * Create the Agent tool
 */
export function createAgentTool(context: ToolUseContext) {
  return buildTool({
    name: 'Agent',
    description: `Spawn a specialized sub-agent to handle a task.

Available agent types:
- general-purpose: Full-capability worker (default)
- explore: Fast, read-only search specialist
- plan: Architecture design agent
- verification: Independent testing agent
- guide: Documentation lookup agent
- statusline: Terminal status configuration

The sub-agent runs in isolation with its own conversation,
tool set, and permission boundaries. Sync agents block until
complete; async agents run in background and notify on completion.`,

    inputSchema: buildAgentSchema({
      multiAgentEnabled: (context.options as any).multiAgentEnabled ?? false,
      isolationEnabled: (context.options as any).isolationEnabled ?? false,
      backgroundEnabled: (context.options as any).backgroundEnabled ?? true,
    }),

    // Custom call that returns the right output type
    call: async (input: any, context: ToolUseContext): Promise<any> => {
      return await executeAgentCall(input as AgentInput, context);
    },
  });
}

/**
 * Execute the agent call with routing logic
 */
async function executeAgentCall(
  input: AgentInput,
  context: ToolUseContext
): Promise<AgentOutput> {
  // Step 1: Determine execution mode
  const shouldRunAsync = input.run_in_background ?? false;

  // Step 2: Resolve agent definition
  const agentDef = agentRegistry.get(input.subagent_type ?? 'general-purpose');

  if (!agentDef) {
    throw new Error(`Unknown agent type: ${input.subagent_type}`);
  }

  // Step 3: Check permissions
  if (!canSpawnAgent(agentDef, context)) {
    throw new Error(`Agent type '${agentDef.agentType}' is not allowed`);
  }

  // Step 4: Execute via runAgent lifecycle
  const agentId = createAgentId();

  if (shouldRunAsync || agentDef.background) {
    // Async path
    const outputFile = getAgentOutputFile(agentId);

    await asyncAgentManager.launch(
      agentDef,
      input.prompt,
      context,
      agentId,
      outputFile
    );

    return {
      status: 'async_launched',
      agentId,
      description: input.description,
      outputFile,
    };
  } else {
    // Sync path
    const result = await collectAgentResult(
      runAgent({
        agentDefinition: agentDef,
        prompt: input.prompt,
        context,
        agentId,
      })
    );

    return {
      status: 'completed',
      result: result.content,
      agentId,
      model: result.model,
      turns: result.turns,
    };
  }
}

/**
 * Check if agent can be spawned
 */
function canSpawnAgent(
  agent: { agentType: string },
  context: ToolUseContext
): boolean {
  const denyRules = (context.options as any).denyAgentRules ?? [];
  
  for (const rule of denyRules) {
    if (agent.agentType === rule || agent.agentType.startsWith(rule)) {
      return false;
    }
  }

  return true;
}

/**
 * Get output file path for async agent
 */
function getAgentOutputFile(agentId: AgentId): string {
  return join(homedir(), '.claude', 'agents', `${agentId}.json`);
}

/**
 * Collect results from agent generator
 */
async function collectAgentResult(
  generator: AsyncGenerator<any, import('./types.js').AgentResult>
): Promise<import('./types.js').AgentResult> {
  const events: any[] = [];
  
  try {
    for await (const event of generator) {
      events.push(event);
    }
  } catch (error) {
    return {
      content: `Error: ${(error as Error).message}`,
      model: 'unknown',
      turns: events.length,
      success: false,
    };
  }

  const content = events
    .filter(e => e.type === 'assistant_message')
    .map((e: any) => e.content)
    .join('');

  return {
    content,
    model: 'claude-3-5-sonnet-20241022',
    turns: Math.ceil(events.length / 3),
    success: true,
  };
}
