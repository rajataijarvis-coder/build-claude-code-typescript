/**
 * Permission System
 * 
 * 7-mode permission system with layered resolution chain.
 */

import { 
  Tool, 
  ToolUseContext, 
  PermissionMode, 
  PermissionRule, 
  PermissionCheckResult 
} from './types.js';

interface ModeBehavior {
  allowByDefault: boolean;
  promptEnabled: boolean;
  autoAllowToolPatterns?: string[];
  denyWriteOperations?: boolean;
  autoDeny?: boolean;
  useClassifier?: boolean;
  escalateToParent?: boolean;
}

/**
 * Permission mode behaviors
 */
const MODE_BEHAVIORS: Record<PermissionMode, ModeBehavior> = {
  default: {
    // Tool-specific checks + prompt for unrecognized
    allowByDefault: false,
    promptEnabled: true,
  },
  acceptEdits: {
    // Auto-allow file edits, prompt for others
    allowByDefault: false,
    promptEnabled: true,
    autoAllowToolPatterns: ['FileEdit', 'Write', 'Edit'],
  },
  plan: {
    // Read-only mode - deny all writes
    allowByDefault: false,
    promptEnabled: false,
    denyWriteOperations: true,
  },
  dontAsk: {
    // Auto-deny anything that would prompt (for background agents)
    allowByDefault: false,
    promptEnabled: false,
    autoDeny: true,
  },
  bypassPermissions: {
    // Allow everything without prompting
    allowByDefault: true,
    promptEnabled: false,
  },
  auto: {
    // Use transcript classifier to decide
    allowByDefault: false,
    promptEnabled: true,
    useClassifier: true,
  },
  bubble: {
    // Escalate to parent context (for sub-agents)
    allowByDefault: false,
    promptEnabled: false,
    escalateToParent: true,
  },
};

interface ClassifierResult {
  approved: boolean;
  confidence: number;
}

/**
 * Resolve permission for a tool call
 */
export async function resolvePermission(
  tool: Tool,
  input: unknown,
  context: ToolUseContext,
  hookResult: PermissionCheckResult,
  classifierPromise: Promise<ClassifierResult>
): Promise<PermissionCheckResult> {
  
  // LAYER 1: Hook decision (if already made)
  if (hookResult.behavior !== 'passthrough') {
    return hookResult;  // Final
  }
  
  // LAYER 2: Rule matching
  const ruleMatch = matchPermissionRule(tool.name, input, context);
  if (ruleMatch) {
    return {
      behavior: ruleMatch.behavior,
      reason: `Matched rule: ${ruleMatch.source}`,
    };
  }
  
  // LAYER 3: Tool-specific check
  const toolCheck = tool.checkPermissions(input as never, context);
  if (toolCheck.behavior !== 'passthrough') {
    return toolCheck;
  }
  
  // LAYER 4: Mode-based default
  const mode = MODE_BEHAVIORS[context.permissionMode];
  if (mode.allowByDefault) {
    return { behavior: 'allow', reason: 'Mode: bypassPermissions' };
  }
  if (mode.denyWriteOperations && !tool.isReadOnly(input as never)) {
    return { behavior: 'deny', reason: 'Mode: plan (read-only)' };
  }
  if (mode.autoDeny) {
    return { behavior: 'deny', reason: 'Mode: dontAsk' };
  }
  
  // LAYER 5: Auto-allow by tool pattern (acceptEdits mode)
  if (mode.autoAllowToolPatterns) {
    const shouldAutoAllow = mode.autoAllowToolPatterns.some(
      pattern => tool.name.includes(pattern)
    );
    if (shouldAutoAllow) {
      return { behavior: 'allow', reason: 'Mode: acceptEdits auto-allow' };
    }
  }
  
  // LAYER 6: Interactive prompt
  if (mode.promptEnabled && context.requestPrompt) {
    const userResponse = await context.requestPrompt({
      tool: tool.name,
      input,
      message: `Allow ${tool.name}?`,
    });
    return {
      behavior: userResponse.toLowerCase().startsWith('y') ? 'allow' : 'deny',
      reason: 'User prompt',
    };
  }
  
  // LAYER 7: Auto classifier
  if (mode.useClassifier) {
    const classifierResult = await classifierPromise;
    return {
      behavior: classifierResult.approved ? 'allow' : 'deny',
      reason: `Classifier: ${classifierResult.confidence}`,
    };
  }
  
  // LAYER 8: Bubble mode - escalate to parent
  if (mode.escalateToParent && context.parentContext?.requestPrompt) {
    const userResponse = await context.parentContext.requestPrompt({
      tool: tool.name,
      input,
      message: `Sub-agent requests ${tool.name}. Allow?`,
    });
    return {
      behavior: userResponse.toLowerCase().startsWith('y') ? 'allow' : 'deny',
      reason: 'Parent prompt (bubble mode)',
    };
  }
  
  // Default: ask (will deny in non-interactive modes)
  return { behavior: 'ask', reason: 'No resolution' };
}

/**
 * Match permission rules with pattern support
 * 
 * Supports patterns like:
 * - Bash(git *) - git commands
 * - Edit(/src/**) - edits in /src directory
 * - Fetch(domain:example.com) - specific domain
 */
function matchPermissionRule(
  toolName: string,
  input: unknown,
  context: ToolUseContext
): PermissionRule | null {
  const allRules = [
    ...context.alwaysAllowRules,
    ...context.alwaysDenyRules,
    ...context.alwaysAskRules,
  ];
  
  for (const rule of allRules) {
    if (rule.toolName !== toolName) continue;
    
    if (!rule.contentPattern) {
      return rule;  // No pattern = matches all
    }
    
    // Pattern matching
    if (matchesPattern(input, rule.contentPattern)) {
      return rule;
    }
  }
  
  return null;
}

/**
 * Pattern matching for permission rules
 */
function matchesPattern(input: unknown, pattern: string): boolean {
  // Bash(git *) pattern - match command prefix
  if (pattern.includes(' ')) {
    const [toolPrefix, cmdPattern] = pattern.split(' ');
    const inputObj = input as Record<string, unknown>;
    const command = inputObj.command || inputObj.cmd || JSON.stringify(input);
    
    if (typeof command === 'string') {
      // Check if command starts with the pattern (e.g., "git")
      if (cmdPattern.endsWith('*')) {
        const prefix = cmdPattern.slice(0, -1);
        return command.startsWith(prefix);
      }
      return command === cmdPattern;
    }
  }
  
  // Path pattern: Edit(/src/**)
  if (pattern.includes('/**')) {
    const prefix = pattern.replace('/**', '');
    const inputObj = input as Record<string, unknown>;
    const path = inputObj.file_path || inputObj.path || inputObj.filePath;
    if (typeof path === 'string') {
      return path.startsWith(prefix);
    }
  }
  
  // Domain pattern: Fetch(domain:example.com)
  if (pattern.startsWith('domain:')) {
    const domain = pattern.replace('domain:', '');
    const inputObj = input as Record<string, unknown>;
    const url = inputObj.url || inputObj.domain;
    if (typeof url === 'string') {
      return url.includes(domain);
    }
  }
  
  return false;
}
