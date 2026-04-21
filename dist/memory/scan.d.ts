/**
 * Memory File Scanning
 *
 * Efficient frontmatter extraction with 30-line limit.
 */
import type { MemoryFile, MemoryFrontmatter } from './types.js';
/**
 * Extract YAML frontmatter from file content
 * Reads only first 30 lines for efficiency
 */
export declare function extractFrontmatter(content: string): {
    frontmatter: MemoryFrontmatter | null;
    body: string;
};
/**
 * Scan directory for memory files
 * Only reads first 30 lines of each file for frontmatter extraction
 */
export declare function scanMemoryFiles(memoryDir: string): Promise<MemoryFile[]>;
//# sourceMappingURL=scan.d.ts.map