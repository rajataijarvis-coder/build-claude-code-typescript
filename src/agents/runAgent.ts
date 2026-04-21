/**
 * runAgent
 *
 * The 15-step lifecycle for sub-agent execution.
 * Creates isolated execution contexts for each agent.
 */

import type {
  AgentDefinition,
  AgentId,
  AgentContext,
  AgentResult,
} from './types.js';
import type { ToolUseContext } from '../tools/types.js';
import { agentLoop } from '../agent/loop.js';

export interface RunAgentParams {
  agentDefinition: AgentDefinition;
  prompt: string;
  context: ToolUseContext;
  agentId: AgentId;
  modelOverride?: string;
  maxTurns?: number;
  allowedTools?: string[];
  isAsync?: boolean;
}

/**
 * The 15-step runAgent lifecycle
 */
export async function* runAgent(
  params: RunAgentParams
): AsyncGenerator<any, AgentResult> {
  const {
    agentDefinition,
    prompt,
    context: parentContext,
    agentId,
    modelOverride,
    maxTurns,
    allowedTools,
    isAsync = false,
  } = params;

  // ========== STEP 1: Model Resolution ==========
  const resolvedModel = resolveAgentModel({
    agentPreference: agentDefinition.model,
    parentModel: parentContext.options.model,
    callerOverride: modelOverride,
  });

  // ========== STEP 2: Agent ID Creation ==========
  // Already have agentId from params

  // ========== STEP 3: Context Preparation ==========
  const contextMessages: any[] = [];
  const promptMessages = [{ role: 'user', content: prompt }];
  const initialMessages = [...contextMessages, ...promptMessages];

  // Clone file state cache
  const agentReadFileState = new Map(parentContext.readFileState);

  // ========== STEP 4: CLAUDE.md Stripping ==========
  const shouldOmitClaudeMd = agentDefinition.omitClaudeMd ?? false;

  // ========== STEP 5: Permission Isolation ==========
  const agentGetAppState = createAgentStateOverlay({
    parentState: (parentContext as any).getAppState?.() ?? {},
    agentPermissionMode: agentDefinition.permissionMode,
    parentPermissionMode: parentContext.permissionMode,
    allowedTools,
    isAsync,
  });

  // ========== STEP 6: Tool Resolution ==========
  const resolvedTools = resolveAgentTools({
    agentDefinition,
    availableTools: parentContext.options.toolSet,
    allowedTools,
    isAsync,
  });

  // ========== STEP 7: System Prompt ==========
  const agentSystemPrompt = await buildAgentSystemPrompt({
    agentDefinition,
    context: parentContext,
    resolvedModel,
  });

  // ========== STEP 8: Abort Controller Isolation ==========
  const agentAbortController = isAsync
    ? new AbortController()
    : parentContext.abortController;

  // ========== STEP 9: Hook Registration ==========
  // Hooks would be registered here in full implementation

  // ========== STEP 10: Skill Preloading ==========
  // Skills would be preloaded here

  // ========== STEP 11: MCP Initialization ==========
  // MCP servers would be initialized here

  // ========== STEP 12: Context Creation ==========
  const agentContext: ToolUseContext = {
    ...parentContext,
    options: {
      ...parentContext.options,
      toolSet: resolvedTools,
      model: resolvedModel,
    },
    agentId,
    messages: initialMessages,
    readFileState: agentReadFileState,
    abortController: agentAbortController,
    permissionMode: agentDefinition.permissionMode,
    alwaysAllowRules: [],
    alwaysDenyRules: [],
    alwaysAskRules: [],
  };

  // ========== STEP 13: Cache-Safe Params Callback ==========
  // For background summarization

  // ========== STEP 14: The Query Loop ==========
  const result: AgentResult = {
    content: '',
    model: resolvedModel,
    turns: 0,
    success: false,
  };

  try {
    const loop = agentLoop({
      messages: initialMessages,
      systemPrompt: agentSystemPrompt,
      maxTurns: maxTurns ?? agentDefinition.maxTurns ?? 25,
      apiKey: (parentContext.options as any).apiKey,
      model: resolvedModel,
    }, false);

    for await (const event of loop) {
      yield event;
      result.turns++;
    }

    result.success = true;
  } catch (error) {
    result.success = false;
    result.content = `Error: ${(error as Error).message}`;
    throw error;
  } finally {
    // ========== STEP 15: Cleanup ==========
    agentReadFileState.clear();
  }

  return result;
}

// ========== Helper Functions ==========

function resolveAgentModel(params: {
  agentPreference: string;
  parentModel: string;
  callerOverride?: string;
}): string {
  if (params.callerOverride) return params.callerOverride;
  if (params.agentPreference === 'inherit') return params.parentModel;
  if (params.agentPreference) return params.agentPreference;
  return params.parentModel;
}

function createAgentStateOverlay(params: {
  parentState: any;
  agentPermissionMode: string;
  parentPermissionMode: string;
  allowedTools?: string[];
  isAsync: boolean;
}): () => any {
  return () => {
    let state = { ...params.parentState };

    const canOverride = !['bypassPermissions', 'acceptEdits', 'auto']
      .includes(params.parentPermissionMode);

    if (params.agentPermissionMode && canOverride) {
      state.permissionMode = params.agentPermissionMode;
    }

    if (params.isAsync) {
      state.shouldAvoidPermissionPrompts = true;
    }

    if (params.allowedTools) {
      state.allowedTools = params.allowedTools;
    }

    return state;
  };
}

function resolveAgentTools(params: {
  agentDefinition: AgentDefinition;
  availableTools: any[];
  allowedTools?: string[];
  isAsync: boolean;
}): any[] {
  let tools = [...params.availableTools];

  if (params.agentDefinition.tools !== '*') {
    const allowedSet = new Set(params.agentDefinition.tools);
    tools = tools.filter(t => allowedSet.has(t.name));
  }

  if (params.agentDefinition.disallowedTools) {
    const blockedSet = new Set(params.agentDefinition.disallowedTools);
    tools = tools.filter(t => !blockedSet.has(t.name));
  }

  if (params.allowedTools) {
    const allowedSet = new Set(params.allowedTools);
    tools = tools.filter(t => allowedSet.has(t.name));
  }

  if (params.isAsync) {
    const asyncAllowed = new Set(['Read', 'Grep', 'Bash']);
    tools = tools.filter(t => asyncAllowed.has(t.name));
  }

  return tools;
}

async function buildAgentSystemPrompt(params: {
  agentDefinition: AgentDefinition;
  context: any;
  resolvedModel: string;
}): Promise<string> {
  const agentContext: AgentContext = {
    toolUseContext: params.context,
    agentType: params.agentDefinition.agentType,
    prompt: '',
  };

  return params.agentDefinition.getSystemPrompt(agentContext);
}
