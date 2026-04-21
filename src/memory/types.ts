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
  name: string;           // Human-readable title
  description: string;      // One-line relevance indicator
  type: MemoryType;         // Taxonomy classification
}

export interface MemoryFile {
  path: string;                    // Absolute file path
  frontmatter: MemoryFrontmatter;  // Parsed YAML header
  body: string;                    // Full content (loaded on demand)
  mtime: number;                   // Modification time for staleness
  size: number;                    // Bytes for budget tracking
}

/**
 * In-memory representation of the memory system state
 */
export interface MemoryState {
  memoryDir: string;               // Base directory path
  indexPath: string;               // MEMORY.md location
  files: Map<string, MemoryFile>;  // All discovered memory files
  surfacedFiles: Set<string>;      // Already loaded this session
  teamDir?: string;                // Team memory subdirectory
}

/**
 * Parsed side-query response
 */
export interface RecallSelection {
  selectedFiles: string[];  // Filenames only, not full paths
  reasoning: string;        // Why these were selected
}

/**
 * System prompt for the Sonnet side-query
 */
export const RECALL_SELECTOR_PROMPT = `You are a memory relevance selector.

Given:
1. A manifest of available memory files (type, name, date, description)
2. The user's current query
3. Recently used tools (to avoid redundant documentation)

Select up to 5 memory files that would be MOST useful for the current query.

Guidelines:
- Be conservative: include only if clearly relevant
- Skip memories for tools already in active use (unless they contain warnings/gotchas)
- Prefer recent memories over old ones when relevance is equal
- Consider memory type: user and feedback memories are usually high-value

Respond with JSON:
{
  "selectedFiles": ["filename1.md", "filename2.md"],
  "reasoning": "Brief explanation of selection rationale"
}`;
