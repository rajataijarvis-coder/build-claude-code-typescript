/**
 * Memory System
 *
 * File-based memory with LLM-powered recall for agent continuity.
 */
export * from './types.js';
export * from './scan.js';
export * from './write.js';
export * from './recall.js';
export * from './staleness.js';
export * from './team.js';
export * from './extraction.js';
export { resolveMemoryPath, sanitizePath, getTeamMemoryPath, getDailyLogPath } from './paths.js';
import type { MemoryState } from './types.js';
/**
 * Initialize memory system for a project
 */
export declare function initializeMemory(gitRoot: string | null, workingDir: string): Promise<MemoryState>;
/**
 * Full recall pipeline
 */
export declare function recallRelevantMemories(state: MemoryState, userQuery: string, recentTools: string[], llmSelector: (manifest: string, query: string, tools: string[]) => Promise<string[]>): Promise<Array<{
    path: string;
    content: string;
}>>;
/**
 * MEMORY.md index size limits
 */
export declare const MEMORY_INDEX_MAX_LINES = 200;
export declare const MEMORY_INDEX_MAX_BYTES = 25000;
/**
 * Validate and report index size issues
 */
export declare function validateIndexSize(content: string): {
    valid: boolean;
    lineCount: number;
    byteCount: number;
    issues: string[];
};
//# sourceMappingURL=index.d.ts.map