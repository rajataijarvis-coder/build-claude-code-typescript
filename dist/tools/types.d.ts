/**
 * Tool System Types
 *
 * Core type definitions for the tool execution system.
 */
import { z } from 'zod';
/**
 * Tool interface with three type parameters:
 * - Input: Zod schema for validation and JSON Schema generation
 * - Output: TypeScript return type
 * - Progress: Progress events emitted during execution
 */
export interface Tool<Input extends z.ZodTypeAny = z.ZodTypeAny, Output = unknown, Progress = unknown> {
    name: string;
    description: string;
    inputSchema: Input;
    call(input: z.infer<Input>, context: ToolUseContext): Promise<ToolResult<Output>>;
    isConcurrencySafe(input: z.infer<Input>): boolean;
    isReadOnly(input: z.infer<Input>): boolean;
    checkPermissions(input: z.infer<Input>, context: ToolUseContext): PermissionCheckResult;
    validateInput?(input: z.infer<Input>): ValidationResult;
    maxResultSizeChars: number;
    isEnabled(): boolean;
    shouldDefer?: boolean;
    /**
     * Interrupt behavior for this tool
     * 'cancel' - Safe to interrupt (reads, searches)
     * 'block' - Must complete (writes, long-running commands)
     */
    interruptBehavior?(input: z.infer<Input>): 'cancel' | 'block';
}
export interface ToolResult<T> {
    data: T;
    newMessages?: Message[];
    contextModifier?: (context: ToolUseContext) => ToolUseContext;
}
export interface Message {
    role: 'user' | 'assistant' | 'tool' | 'system';
    content: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
    name?: string;
}
export interface ToolCall {
    id: string;
    name: string;
    input: Record<string, unknown>;
}
export interface ToolUseContext {
    options: {
        toolSet: Tool[];
        model: string;
        debug: boolean;
    };
    abortController: AbortController;
    readFileState: Map<string, FileState>;
    messages: Message[];
    workingDirectory: string;
    permissionMode: PermissionMode;
    alwaysAllowRules: PermissionRule[];
    alwaysDenyRules: PermissionRule[];
    alwaysAskRules: PermissionRule[];
    requestPrompt?: (request: PromptRequest) => Promise<string>;
    agentId?: string;
    renderedSystemPrompt?: string;
    parentContext?: ToolUseContext;
}
export interface FileState {
    content: string;
    mtime: Date;
    size: number;
}
export type PermissionMode = 'default' | 'acceptEdits' | 'plan' | 'dontAsk' | 'bypassPermissions' | 'auto' | 'bubble';
export interface PermissionRule {
    source: 'userSettings' | 'projectSettings' | 'localSettings' | 'cliArg' | 'policySettings' | 'session';
    behavior: 'allow' | 'deny' | 'ask';
    toolName: string;
    contentPattern?: string;
}
export interface PermissionCheckResult {
    behavior: 'allow' | 'deny' | 'ask' | 'passthrough';
    updatedInput?: unknown;
    reason?: string;
}
export interface ValidationResult {
    valid: boolean;
    error?: string;
}
export interface PromptRequest {
    tool: string;
    input: unknown;
    message: string;
}
export interface ErrorClassification {
    category: string;
    type: string;
    safeMessage: string;
    errno?: string;
    telemetrySafe: boolean;
}
/**
 * Tool use block from API response (for streaming executor)
 */
export interface ToolUseBlock {
    id: string;
    name: string;
    input: Record<string, unknown>;
}
//# sourceMappingURL=types.d.ts.map