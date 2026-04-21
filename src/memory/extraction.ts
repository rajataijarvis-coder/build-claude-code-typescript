/**
 * Background Memory Extraction
 *
 * Forked agent catches memories the main agent missed.
 */

import type { Message } from '../agent/types.js';

/**
 * Background extraction agent configuration
 *
 * Runs at end of each complete query loop
 * Shares parent's prompt cache via fork
 * Skips if main agent already saved in current turn range
 */
export interface ExtractionConfig {
  memoryDir: string;
  turnRange: { start: number; end: number };
  mainAgentSaved: boolean;  // Skip if true
  toolBudget: string[];     // Read-only + memory write only
}

/**
 * Extraction agent prompt
 *
 * Constrained tool budget:
 * - ReadFileTool, GlobTool, GrepTool (read-only)
 * - WriteFileTool, FileEditTool (memory paths only)
 *
 * Two-turn strategy:
 * Turn 1: Read MEMORY.md, existing memories in parallel
 * Turn 2: Write any missed memories in parallel
 */
export const EXTRACTION_PROMPT = `You are a memory extraction agent.

Analyze the recent conversation and extract any memories the main agent missed.

Tool constraints:
- Use read-only tools (ReadFile, Glob, Grep) for investigation
- Use WriteFile/FileEdit ONLY for paths within the memory directory

Strategy:
1. First, read MEMORY.md and check what memories exist
2. Identify what should have been saved but wasn't
3. Write the missing memories following the two-step protocol

Focus on: user preferences, corrections, project context, feedback.

Memory format:
---
name: {concise name}
description: {one-line relevance indicator}
type: {user|feedback|project|reference}
---

{content with Why and How to apply sections for feedback}`;

/**
 * Determine if extraction should run
 */
export function shouldRunExtraction(
  config: ExtractionConfig
): boolean {
  // Don't duplicate main agent's work
  if (config.mainAgentSaved) return false;

  // Require valid turn range
  if (config.turnRange.start >= config.turnRange.end) return false;

  return true;
}

/**
 * Count memories written in turn range
 * Used to detect if main agent already saved
 */
export function countMemoriesInRange(
  messages: Message[],
  turnRange: { start: number; end: number }
): number {
  let count = 0;
  for (let i = turnRange.start; i < turnRange.end && i < messages.length; i++) {
    const msg = messages[i];
    // Check for memory-related tool calls
    if (msg.role === 'assistant' && msg.tool_calls) {
      for (const call of msg.tool_calls) {
        if (call.name?.includes('WriteFile') ||
            call.name?.includes('FileEdit')) {
          // Check if target is in memory directory
          const target = call.input?.file_path || call.input?.path || '';
          if (typeof target === 'string' && target.includes('memory/')) {
            count++;
          }
        }
      }
    }
  }
  return count;
}

/**
 * Build extraction context from conversation
 */
export function buildExtractionContext(
  messages: Message[],
  turnRange: { start: number; end: number }
): string {
  const relevant = messages.slice(turnRange.start, turnRange.end);
  return relevant
    .map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
    .join('\n\n');
}
