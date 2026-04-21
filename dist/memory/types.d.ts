/**
 * Memory System Types
 *
 * File-based memory with LLM-powered recall.
 */
export type MemoryType = 'user' | 'feedback' | 'project' | 'reference';
/**
 * Core question: Is this knowledge derivable from the current project state?
 *
 * Code patterns, git history, file structure — all re-derivable. Excluded.
 * These four capture what cannot be re-derived.
 */
/**
 * User memories: Information about the person
 * - Role, goals, responsibilities, expertise level
 * - "Senior Go engineer, new to React"
 * - Affects explanation style, depth, assumptions
 */
/**
 * Feedback memories: Guidance about how to work
 * - Corrections AND confirmations
 * - Specific structure: rule + Why + How to apply
 */
/**
 * Project memories: Ongoing work context
 * - Who is doing what, why, by when
 * - Relative dates converted to absolute ("Thursday" → "2026-04-16")
 */
/**
 * Reference memories: Bookmarks to external systems
 * - Linear project URL, Grafana dashboard, Slack channel
 * - Tell the model WHERE to look, not WHAT to find
 */
export interface MemoryFrontmatter {
    name: string;
    description: string;
    type: MemoryType;
}
export interface MemoryFile {
    path: string;
    frontmatter: MemoryFrontmatter;
    body: string;
    mtime: number;
    size: number;
}
/**
 * In-memory representation of the memory system state
 */
export interface MemoryState {
    memoryDir: string;
    indexPath: string;
    files: Map<string, MemoryFile>;
    surfacedFiles: Set<string>;
    teamDir?: string;
}
/**
 * Parsed side-query response
 */
export interface RecallSelection {
    selectedFiles: string[];
    reasoning: string;
}
/**
 * System prompt for the Sonnet side-query
 */
export declare const RECALL_SELECTOR_PROMPT = "You are a memory relevance selector.\n\nGiven:\n1. A manifest of available memory files (type, name, date, description)\n2. The user's current query\n3. Recently used tools (to avoid redundant documentation)\n\nSelect up to 5 memory files that would be MOST useful for the current query.\n\nGuidelines:\n- Be conservative: include only if clearly relevant\n- Skip memories for tools already in active use (unless they contain warnings/gotchas)\n- Prefer recent memories over old ones when relevance is equal\n- Consider memory type: user and feedback memories are usually high-value\n\nRespond with JSON:\n{\n  \"selectedFiles\": [\"filename1.md\", \"filename2.md\"],\n  \"reasoning\": \"Brief explanation of selection rationale\"\n}";
//# sourceMappingURL=types.d.ts.map