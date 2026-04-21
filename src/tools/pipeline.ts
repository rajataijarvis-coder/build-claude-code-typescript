/**
 * Tool Execution Pipeline
 *
 * The 14-step execution pipeline for tool calls.
 */

import {
  Tool,
  ToolResult,
  ToolUseContext,
  ToolCall,
  PermissionCheckResult,
  Message
} from './types.js';
import { ToolRegistry } from './registry.js';
import { resolvePermission } from './permissions.js';
import { classifyToolError } from './errors.js';
import { createHash } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface PipelineState {
  toolCall: ToolCall;
  tool: Tool;
  parsedInput: unknown;
  abortController: AbortController;
}

/**
 * The 14-step execution pipeline
 */
export async function executeToolPipeline(
  toolCall: ToolCall,
  context: ToolUseContext,
  registry: ToolRegistry
): Promise<ToolResult<unknown>> {

  // === STEP 1: Tool Lookup ===
  const tool = registry.lookup(toolCall.name);
  if (!tool) {
    const availableTools = registry.getNames().join(', ');
    return {
      data: `Unknown tool: ${toolCall.name}. Available tools: ${availableTools}`,
      newMessages: [],
    };
  }

  // === STEP 2: Abort Check ===
  if (context.abortController.signal.aborted) {
    return {
      data: 'Tool execution aborted',
      newMessages: [],
    };
  }

  // === STEP 3: Zod Validation ===
  const parseResult = tool.inputSchema.safeParse(toolCall.input);
  if (!parseResult.success) {
    // For deferred tools, hint to call ToolSearch first
    const hint = tool.shouldDefer
      ? ' This is a deferred tool. Call ToolSearch first to load its schema.'
      : '';
    return {
      data: `Input validation failed: ${parseResult.error.message}${hint}`,
      newMessages: [],
    };
  }
  const parsedInput = parseResult.data;

  // === STEP 4: Semantic Validation ===
  if (tool.validateInput) {
    const validation = tool.validateInput(parsedInput);
    if (!validation.valid) {
      return {
        data: validation.error || 'Semantic validation failed',
        newMessages: [],
      };
    }
  }

  // === STEP 5: Speculative Classifier Start ===
  // (Placeholder - would start auto-mode classifier in parallel)
  const classifierPromise = Promise.resolve({ approved: true, confidence: 1.0 });

  // === STEP 6: Input Backfill ===
  // Clone input and add derived fields (e.g., expand ~/ to absolute path)
  const enrichedInput = enrichInput(parsedInput, context);

  // === STEP 7: Pre-ToolUse Hooks ===
  const hookResult: PermissionCheckResult = { behavior: 'passthrough' };
  // Hook execution would go here
  if (hookResult.behavior === 'deny') {
    return {
      data: hookResult.reason || 'Denied by hook',
      newMessages: [],
    };
  }

  // === STEP 8: Permission Resolution ===
  const permission = await resolvePermission(
    tool,
    enrichedInput,
    context,
    hookResult,
    classifierPromise
  );

  // === STEP 9: Permission Denied? ===
  if (permission.behavior === 'deny') {
    // Run permission denied hooks
    return {
      data: permission.reason || 'Permission denied',
      newMessages: [],
    };
  }

  // === STEP 10: Tool Execution ===
  let result: ToolResult<unknown>;
  try {
    result = await tool.call(enrichedInput, context);
  } catch (error) {
    // Jump to error handling
    return handleToolError(tool, toolCall, error, context);
  }

  // === STEP 11: Result Budgeting ===
  result = await applyResultBudgeting(result, tool.maxResultSizeChars, context);

  // === STEP 12: Post-ToolUse Hooks ===
  // Hook execution would go here

  // === STEP 13: New Messages ===
  if (result.newMessages) {
    context.messages.push(...result.newMessages);
  }

  // === STEP 14: Error Handling & Telemetry ===
  // Classify error for telemetry (safe strings only, no raw messages)
  // Emit OTel events

  return result;
}

/**
 * Input enrichment - add derived fields without mutating original
 */
function enrichInput(input: unknown, context: ToolUseContext): unknown {
  if (typeof input !== 'object' || input === null) {
    return input;
  }

  const enriched = { ...input } as Record<string, unknown>;

  // Expand paths like ~/file.txt to absolute paths
  if ('file_path' in enriched && typeof enriched.file_path === 'string') {
    const filePath = enriched.file_path as string;
    if (filePath.startsWith('~/')) {
      enriched.file_path = filePath.replace(
        '~/',
        homedir() + '/'
      );
    }
    if (!(enriched.file_path as string).startsWith('/')) {
      enriched.file_path = `${context.workingDirectory}/${enriched.file_path}`;
    }
  }

  // Expand cwd if present
  if ('cwd' in enriched && typeof enriched.cwd === 'string') {
    const cwd = enriched.cwd as string;
    if (cwd.startsWith('~/')) {
      enriched.cwd = cwd.replace('~/', homedir() + '/');
    }
  }

  return enriched;
}

/**
 * Compute hash for result persistence
 */
function computeHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Apply result budgeting - persist oversized results to disk
 */
async function applyResultBudgeting<T>(
  result: ToolResult<T>,
  maxSize: number,
  _context: ToolUseContext
): Promise<ToolResult<T>> {
  if (maxSize === Infinity) {
    return result;
  }

  const resultStr = typeof result.data === 'string'
    ? result.data
    : JSON.stringify(result.data);

  if (resultStr.length <= maxSize) {
    return result;
  }

  // Persist to disk and replace with preview
  const hash = computeHash(resultStr);
  const persistDir = join(homedir(), '.claude', 'tool-results');
  const persistPath = join(persistDir, `${hash}.txt`);

  // Ensure directory exists
  if (!existsSync(persistDir)) {
    await mkdir(persistDir, { recursive: true });
  }

  // Write full content
  await writeFile(persistPath, resultStr, 'utf-8');

  // Create preview
  const preview = resultStr.substring(0, 500);
  const remaining = resultStr.length - 500;

  const wrapped = `<persisted-output path="${persistPath}" size="${resultStr.length}">
${preview}
${remaining > 0 ? `\n... (${remaining} more characters)` : ''}
</persisted-output>`;

  return {
    ...result,
    data: wrapped as unknown as T,
  };
}

/**
 * Handle tool errors with telemetry-safe classification
 */
function handleToolError(
  _tool: Tool,
  toolCall: ToolCall,
  error: unknown,
  _context: ToolUseContext
): ToolResult<unknown> {
  const classification = classifyToolError(error);

  // Log telemetry event (would emit OTel here)
  console.error(`[Telemetry] Tool error: ${classification.type} (${classification.category})`);

  return {
    data: classification.safeMessage,
    newMessages: [{
      role: 'system',
      content: `Tool ${toolCall.name} failed: ${classification.safeMessage}`,
    }],
  };
}
