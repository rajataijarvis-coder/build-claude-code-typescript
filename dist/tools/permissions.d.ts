/**
 * Permission System
 *
 * 7-mode permission system with layered resolution chain.
 */
import { Tool, ToolUseContext, PermissionCheckResult } from './types.js';
interface ClassifierResult {
    approved: boolean;
    confidence: number;
}
/**
 * Resolve permission for a tool call
 */
export declare function resolvePermission(tool: Tool, input: unknown, context: ToolUseContext, hookResult: PermissionCheckResult, classifierPromise: Promise<ClassifierResult>): Promise<PermissionCheckResult>;
export {};
//# sourceMappingURL=permissions.d.ts.map