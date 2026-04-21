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
export declare const SAFE_DEFAULTS: {
    isEnabled: () => boolean;
    isConcurrencySafe: () => boolean;
    isReadOnly: () => boolean;
    isDestructive: () => boolean;
    checkPermissions: () => PermissionCheckResult;
    maxResultSizeChars: number;
    shouldDefer: boolean;
    validateInput: undefined;
};
/**
 * buildTool - Factory that applies fail-closed defaults
 *
 * The definition overrides defaults. If a tool forgets to set
 * isConcurrencySafe, it defaults to false (serial execution).
 */
export declare function buildTool<TInput extends z.ZodTypeAny, TOutput, TProgress>(definition: Partial<Tool<TInput, TOutput, TProgress>> & Pick<Tool<TInput, TOutput, TProgress>, 'name' | 'description' | 'inputSchema' | 'call'>): Tool<TInput, TOutput, TProgress>;
//# sourceMappingURL=buildTool.d.ts.map