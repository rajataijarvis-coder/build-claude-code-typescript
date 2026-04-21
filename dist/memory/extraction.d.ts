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
    turnRange: {
        start: number;
        end: number;
    };
    mainAgentSaved: boolean;
    toolBudget: string[];
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
export declare const EXTRACTION_PROMPT = "You are a memory extraction agent.\n\nAnalyze the recent conversation and extract any memories the main agent missed.\n\nTool constraints:\n- Use read-only tools (ReadFile, Glob, Grep) for investigation\n- Use WriteFile/FileEdit ONLY for paths within the memory directory\n\nStrategy:\n1. First, read MEMORY.md and check what memories exist\n2. Identify what should have been saved but wasn't\n3. Write the missing memories following the two-step protocol\n\nFocus on: user preferences, corrections, project context, feedback.\n\nMemory format:\n---\nname: {concise name}\ndescription: {one-line relevance indicator}\ntype: {user|feedback|project|reference}\n---\n\n{content with Why and How to apply sections for feedback}";
/**
 * Determine if extraction should run
 */
export declare function shouldRunExtraction(config: ExtractionConfig): boolean;
/**
 * Count memories written in turn range
 * Used to detect if main agent already saved
 */
export declare function countMemoriesInRange(messages: Message[], turnRange: {
    start: number;
    end: number;
}): number;
/**
 * Build extraction context from conversation
 */
export declare function buildExtractionContext(messages: Message[], turnRange: {
    start: number;
    end: number;
}): string;
//# sourceMappingURL=extraction.d.ts.map