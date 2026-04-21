/**
 * Built-in Agents
 *
 * The six specialized agent types available system-wide.
 */

import type { AgentDefinition, AgentContext } from './types.js';
import type { PermissionMode } from '../tools/types.js';

/**
 * Built-in agent registry
 */
export function getBuiltInAgents(): AgentDefinition[] {
  return [
    createGeneralPurposeAgent(),
    createExploreAgent(),
    createPlanAgent(),
    createVerificationAgent(),
    createGuideAgent(),
    createStatuslineAgent(),
  ];
}

/**
 * General-Purpose Agent
 */
function createGeneralPurposeAgent(): AgentDefinition {
  return {
    agentType: 'general-purpose',
    name: 'General Purpose',
    description: 'Full-capability worker for any task',
    model: 'inherit',
    permissionMode: 'bubble' as PermissionMode,
    tools: '*',
    disallowedTools: ['Agent'],
    maxTurns: 50,
    background: false,
    omitClaudeMd: false,

    getSystemPrompt: (ctx: AgentContext) =>
      `You are a Claude Code sub-agent. Complete the task fully.

Search Strategy:
- Start broad (Grep for patterns, Read key files)
- Then narrow (examine specific functions)
- Look for tests to understand behavior

Task: ${ctx.prompt}`.trim(),
  };
}

/**
 * Explore Agent
 */
function createExploreAgent(): AgentDefinition {
  return {
    agentType: 'explore',
    name: 'Explore',
    description: 'Fast read-only search of the codebase',
    model: 'haiku',
    permissionMode: 'dontAsk' as PermissionMode,
    tools: ['Read', 'Grep', 'Bash'],
    disallowedTools: ['FileEdit', 'FileWrite', 'NotebookEdit', 'Agent'],
    maxTurns: 25,
    background: false,
    omitClaudeMd: true,
    color: 'green',

    getSystemPrompt: (ctx: AgentContext) =>
      `=== CRITICAL: READ-ONLY MODE ===
You are an EXPLORATION agent. You CANNOT edit any files.

Your ONLY job is to SEARCH and REPORT what you find.

Search Strategy:
1. Use Grep to find relevant files
2. Read key files to understand structure
3. Report findings concisely

Task: ${ctx.prompt}

Report file paths and line numbers.`.trim(),
  };
}

/**
 * Plan Agent
 */
function createPlanAgent(): AgentDefinition {
  return {
    agentType: 'plan',
    name: 'Plan',
    description: 'Design software architecture',
    model: 'inherit',
    permissionMode: 'dontAsk' as PermissionMode,
    tools: ['Read', 'Grep', 'Bash'],
    disallowedTools: ['FileEdit', 'FileWrite', 'Agent'],
    maxTurns: 30,
    background: false,
    omitClaudeMd: true,
    color: 'blue',

    getSystemPrompt: (ctx: AgentContext) =>
      `You are a software architect. Your job is to DESIGN, not IMPLEMENT.

4-Step Process:
1. Understand Requirements
2. Explore Thoroughly
3. Design Solution
4. Detail the Plan

Your output MUST end with:

## Critical Files for Implementation
- file/path.ts - what to do here

Task: ${ctx.prompt}`.trim(),
  };
}

/**
 * Verification Agent
 */
function createVerificationAgent(): AgentDefinition {
  return {
    agentType: 'verification',
    name: 'Verification',
    description: 'Adversarial testing and verification',
    model: 'inherit',
    permissionMode: 'dontAsk' as PermissionMode,
    tools: ['Read', 'Grep', 'Bash'],
    disallowedTools: ['FileEdit', 'FileWrite', 'Agent'],
    maxTurns: 40,
    background: true,
    omitClaudeMd: false,
    color: 'red',

    getSystemPrompt: (ctx: AgentContext) =>
      `You are a VERIFICATION agent. Find problems, don't fix them.

CRITICAL: You are read-only. Report issues clearly.

Required for Every Check:
1. Run actual verification command
2. Include command output verbatim
3. Interpret results honestly

Include at least one adversarial probe:
- Concurrency, Boundaries, Idempotency, Orphan cleanup

Task: ${ctx.prompt}

Report: ✅ PASS / ❌ FAIL / ⚠️ UNCERTAIN`.trim(),
  };
}

/**
 * Guide Agent
 */
function createGuideAgent(): AgentDefinition {
  return {
    agentType: 'guide',
    name: 'Claude Code Guide',
    description: 'Answer questions about Claude Code',
    model: 'haiku',
    permissionMode: 'dontAsk' as PermissionMode,
    tools: ['Read', 'Bash'],
    disallowedTools: ['FileEdit', 'FileWrite', 'Agent'],
    maxTurns: 20,
    background: false,
    omitClaudeMd: false,

    getSystemPrompt: (ctx: AgentContext) =>
      `You are the Claude Code documentation agent.

Help with:
- Claude Code features and commands
- Claude Agent SDK questions
- Claude API documentation

Task: ${ctx.prompt}

Provide clear answers with links to docs.`.trim(),
  };
}

/**
 * Statusline Agent
 */
function createStatuslineAgent(): AgentDefinition {
  return {
    agentType: 'statusline',
    name: 'Statusline Setup',
    description: 'Configure terminal status line',
    model: 'sonnet',
    permissionMode: 'bubble' as PermissionMode,
    tools: ['Read', 'Edit'],
    maxTurns: 15,
    background: false,
    color: 'orange',

    getSystemPrompt: (ctx: AgentContext) =>
      `You are the statusline configuration agent.

Configure the terminal status line for Claude Code.

Status Line:
- Supports shell escape sequences
- Written to ~/.claude/settings.json

Task: ${ctx.prompt}

Edit ~/.claude/settings.json`.trim(),
  };
}
