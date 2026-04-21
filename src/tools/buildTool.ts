/**
 * buildTool - Factory with Fail-Closed Defaults
 * 
 * Every tool passes through this factory to get safe default behaviors.
 */

import { Tool, PermissionCheckResult } from './types.js';
import { z } from 'zod';

/**
 * SAFE_DEFAULTS - Fail-closed for safety
 * 
 * A new tool that forgets to implement these gets the SAFE behavior,
 * not the dangerous one.
 */
export const SAFE_DEFAULTS = {
  // Feature gating - enabled by default
  isEnabled: () => true,
  
  // FAIL-CLOSED: New tools run serially unless explicitly marked safe
  isConcurrencySafe: () => false,
  
  // FAIL-CLOSED: New tools treated as writes unless explicitly marked read-only
  isReadOnly: () => false,
  
  // Destructive operations require explicit marking
  isDestructive: () => false,
  
  // Permission check - "passthrough" means defer to general permission system
  checkPermissions: (): PermissionCheckResult => ({ behavior: 'passthrough' }),
  
  // Result budgeting - conservative default
  maxResultSizeChars: 10000,
  
  // Deferred loading - disabled by default for built-in tools
  shouldDefer: false,
  
  // No semantic validation by default
  validateInput: undefined,
};

/**
 * buildTool - Factory that applies fail-closed defaults
 * 
 * The definition overrides defaults. If a tool forgets to set
 * isConcurrencySafe, it defaults to false (serial execution).
 */
export function buildTool<
  TInput extends z.ZodTypeAny,
  TOutput,
  TProgress
>(
  definition: Partial<Tool<TInput, TOutput, TProgress>> & 
    Pick<Tool<TInput, TOutput, TProgress>, 'name' | 'description' | 'inputSchema' | 'call'>
): Tool<TInput, TOutput, TProgress> {
  return {
    ...SAFE_DEFAULTS,
    ...definition,
  } as Tool<TInput, TOutput, TProgress>;
}
