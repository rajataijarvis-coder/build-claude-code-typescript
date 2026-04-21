/**
 * Hooks Executor
 *
 * Execute hooks at lifecycle events with proper aggregation.
 */
import type { ExecuteHooksOptions, AggregatedHookResult, HookEvent } from './types.js';
/**
 * Match tool name against pattern.
 * Supports wildcards: "Bash(git *)" matches "Bash(git status)"
 */
export declare function matchToolPattern(pattern: string, toolName: string): boolean;
/**
 * Execute all hooks for a lifecycle event.
 *
 * Returns aggregated result with precedence:
 *   deny > ask > allow
 *   blocking error > all else
 */
export declare function executeHooks(options: ExecuteHooksOptions): Promise<AggregatedHookResult>;
/**
 * Quick check if any hooks match an event (for fast path optimization).
 */
export declare function hasHooksForEvent(event: HookEvent): boolean;
/**
 * Check if any hooks match a specific tool call.
 */
export declare function hasHooksForTool(event: HookEvent, toolName: string): boolean;
//# sourceMappingURL=executor.d.ts.map