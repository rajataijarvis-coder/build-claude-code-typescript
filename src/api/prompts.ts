export interface SystemPromptSection {
  content: string;
  cacheScope: 'global' | 'session';
}

/**
 * Build system prompt with cache-optimized structure
 * 
 * The prompt is split at the DYNAMIC BOUNDARY:
 * - Before: Static content (same for all users, globally cached)
 * - After: User-specific content (per-session cached)
 */
export function buildSystemPrompt(context: PromptContext): SystemPromptSection[] {
  const sections: SystemPromptSection[] = [];

  sections.push(
    {
      content: `You are Claude Code, an AI coding assistant.`,
      cacheScope: 'global',
    },
    {
      content: SYSTEM_BEHAVIOR_RULES,
      cacheScope: 'global',
    },
    {
      content: TOOL_USAGE_GUIDANCE,
      cacheScope: 'global',
    }
  );

  if (context.sessionGuidance) {
    sections.push({
      content: context.sessionGuidance,
      cacheScope: 'session',
    });
  }

  if (context.memoryContent) {
    sections.push({
      content: `## Project Memory\n\n${context.memoryContent}`,
      cacheScope: 'session',
    });
  }

  sections.push({
    content: `## Environment\n- CWD: ${context.cwd}\n- Shell: ${context.shell}`,
    cacheScope: 'session',
  });

  if (context.mcpInstructions) {
    sections.push({
      content: `## MCP Tools\n\n${context.mcpInstructions}`,
      cacheScope: 'session',
    });
  }

  return sections;
}

const SYSTEM_BEHAVIOR_RULES = `## System Behavior

You are an agent that can:
- Read and write files
- Execute shell commands
- Search code
- Ask the user for clarification

Always explain your reasoning before taking action.`;

const TOOL_USAGE_GUIDANCE = `## Tool Usage

When you need to use a tool:
1. Explain why you're using it
2. Use the exact tool name and parameters
3. Wait for results before proceeding`;

export interface PromptContext {
  cwd: string;
  shell: string;
  sessionGuidance?: string;
  memoryContent?: string;
  mcpInstructions?: string;
}
