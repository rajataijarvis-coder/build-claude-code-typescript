/**
 * Memory Write Operations
 *
 * Two-step protocol: create file, update index.
 */
import type { MemoryFrontmatter } from './types.js';
/**
 * Format memory content with frontmatter
 */
export declare function formatMemoryContent(frontmatter: MemoryFrontmatter, body: string): string;
/**
 * Format a single index entry
 * Must stay under ~150 characters
 */
export declare function formatIndexEntry(filename: string, description: string): string;
/**
 * Two-step memory write protocol
 *
 * Step 1: Create the memory file
 * Step 2: Update the MEMORY.md index
 */
export declare function writeMemory(memoryDir: string, filename: string, frontmatter: MemoryFrontmatter, body: string): Promise<void>;
/**
 * Update an existing memory file
 * Preserves frontmatter, replaces body
 */
export declare function updateMemoryBody(filePath: string, newBody: string): Promise<void>;
/**
 * Delete a memory file and update index
 * (Note: Index cleanup is batched, not immediate)
 */
export declare function deleteMemory(memoryDir: string, filename: string): Promise<void>;
//# sourceMappingURL=write.d.ts.map