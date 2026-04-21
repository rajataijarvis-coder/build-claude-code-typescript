/**
 * Memory Recall System
 *
 * LLM-powered relevance selection for memory retrieval.
 */
import type { MemoryFile, RecallSelection } from './types.js';
/**
 * Format memory manifest for the LLM selector
 * One line per file: type, name, date, description
 */
export declare function formatMemoryManifest(files: MemoryFile[], surfacedFiles: Set<string>): string;
/**
 * Validate selected filenames against known set
 * Catches hallucinated filenames from the LLM
 */
export declare function validateSelections(selections: string[], knownFiles: MemoryFile[]): {
    valid: string[];
    invalid: string[];
};
/**
 * Parse LLM selector response
 */
export declare function parseRecallResponse(json: string): RecallSelection;
/**
 * Calculate relevance score for ranking
 * Higher score = more relevant
 */
export declare function calculateRelevanceScore(file: MemoryFile, query: string): number;
//# sourceMappingURL=recall.d.ts.map