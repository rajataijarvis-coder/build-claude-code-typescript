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
// Selective re-exports from paths to avoid conflicts with kairos.ts
export { resolveMemoryPath, sanitizePath, getTeamMemoryPath, getDailyLogPath } from './paths.js';
import { scanMemoryFiles } from './scan.js';
import { formatMemoryManifest, validateSelections } from './recall.js';
import { wrapWithStaleness } from './staleness.js';
import { resolveMemoryPath } from './paths.js';
/**
 * Initialize memory system for a project
 */
export async function initializeMemory(gitRoot, workingDir) {
    const memoryDir = await resolveMemoryPath(gitRoot, workingDir);
    const indexPath = `${memoryDir}/MEMORY.md`;
    return {
        memoryDir,
        indexPath,
        files: new Map(),
        surfacedFiles: new Set(),
        teamDir: `${memoryDir}/team`
    };
}
/**
 * Full recall pipeline
 */
export async function recallRelevantMemories(state, userQuery, recentTools, llmSelector) {
    // Scan for available memories
    const files = await scanMemoryFiles(state.memoryDir);
    // Format manifest
    const manifest = formatMemoryManifest(files, state.surfacedFiles);
    // Run LLM side-query
    const selections = await llmSelector(manifest, userQuery, recentTools);
    // Validate and load selected files
    const { valid } = validateSelections(selections, files);
    const results = [];
    for (const filePath of valid) {
        const file = files.find(f => f.path === filePath);
        if (!file)
            continue;
        // Load full content
        const { readFile } = await import('fs/promises');
        const fullContent = await readFile(filePath, 'utf-8');
        // Wrap with staleness warning
        const content = wrapWithStaleness(fullContent, file.mtime);
        results.push({ path: filePath, content });
        state.surfacedFiles.add(filePath);
    }
    return results;
}
/**
 * MEMORY.md index size limits
 */
export const MEMORY_INDEX_MAX_LINES = 200;
export const MEMORY_INDEX_MAX_BYTES = 25000;
/**
 * Validate and report index size issues
 */
export function validateIndexSize(content) {
    const lines = content.split('\n');
    const bytes = Buffer.byteLength(content, 'utf-8');
    const issues = [];
    if (lines.length > MEMORY_INDEX_MAX_LINES) {
        issues.push(`Index exceeds ${MEMORY_INDEX_MAX_LINES} lines (${lines.length}). ` +
            'Consider consolidating old memories or moving details into topic files.');
    }
    if (bytes > MEMORY_INDEX_MAX_BYTES) {
        issues.push(`Index exceeds ${MEMORY_INDEX_MAX_BYTES} bytes (${bytes}). ` +
            'Keep entries under ~200 chars. Move detail into topic files.');
    }
    return { valid: issues.length === 0, lineCount: lines.length, byteCount: bytes, issues };
}
//# sourceMappingURL=index.js.map