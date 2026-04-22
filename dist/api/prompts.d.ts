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
export declare function buildSystemPrompt(context: PromptContext): SystemPromptSection[];
export interface PromptContext {
    cwd: string;
    shell: string;
    sessionGuidance?: string;
    memoryContent?: string;
    mcpInstructions?: string;
}
//# sourceMappingURL=prompts.d.ts.map