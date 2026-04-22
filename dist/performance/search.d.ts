/**
 * Search Optimization
 *
 * Bitmap pre-filters, score-bound rejection, and async indexing
 * for fast file search in large codebases.
 */
/** Character bitmap for pre-filtering */
export type CharBitmap = number;
/** Search result entry */
export interface SearchResult {
    path: string;
    score: number;
    matches: MatchPosition[];
}
/** Match position in path */
export interface MatchPosition {
    start: number;
    end: number;
}
/** Indexed file entry */
export interface IndexedFile {
    path: string;
    lowerPath: string;
    charBitmap: CharBitmap;
}
/** Search configuration */
export interface SearchConfig {
    maxResults: number;
    caseSensitive: boolean;
    /** Yield to event loop every N iterations */
    yieldInterval: number;
}
/**
 * Build 26-bit character bitmap for a path
 *
 * Each bit represents presence of a-z in the path.
 * Used for fast rejection of paths that can't match query.
 */
export declare function buildCharBitmap(path: string): CharBitmap;
/**
 * Build bitmap for query string
 */
export declare function buildQueryBitmap(query: string): CharBitmap;
/**
 * Check if path could contain all query characters
 */
export declare function couldMatch(pathBitmap: CharBitmap, queryBitmap: CharBitmap): boolean;
/**
 * Calculate fuzzy match score for a path
 *
 * Higher score = better match
 */
export declare function calculateScore(path: string, query: string, positions: MatchPosition[]): number;
/**
 * Find match positions using fused indexOf scan
 *
 * Uses SIMD-accelerated String.indexOf instead of manual loops.
 */
export declare function findMatchPositions(path: string, query: string): MatchPosition[];
/**
 * Async file indexer with partial queryability
 */
export declare class AsyncFileIndexer {
    private files;
    private isIndexing;
    private resolveQueryable;
    private queryablePromise;
    constructor();
    /**
     * Start indexing files asynchronously
     *
     * Yields to event loop every few milliseconds to maintain responsiveness.
     */
    indexFiles(filePaths: string[]): Promise<{
        queryable: Promise<void>;
        done: Promise<number>;
    }>;
    private runIndexing;
    /**
     * Search indexed files
     */
    search(query: string, config?: Partial<SearchConfig>): SearchResult[];
    /**
     * Get indexed file count
     */
    getFileCount(): number;
    /**
     * Check if indexing is complete
     */
    isReady(): boolean;
}
/** Global indexer instance */
export declare const fileIndexer: AsyncFileIndexer;
/**
 * Simple synchronous search for smaller datasets
 */
export declare function searchFiles(files: string[], query: string, maxResults?: number): SearchResult[];
//# sourceMappingURL=search.d.ts.map