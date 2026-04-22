/**
 * Search Optimization
 *
 * Bitmap pre-filters, score-bound rejection, and async indexing
 * for fast file search in large codebases.
 */
import { profileCheckpoint } from './profiler.js';
const DEFAULT_CONFIG = {
    maxResults: 50,
    caseSensitive: false,
    yieldInterval: 256, // Power of 2 for branchless modulo
};
/**
 * Build 26-bit character bitmap for a path
 *
 * Each bit represents presence of a-z in the path.
 * Used for fast rejection of paths that can't match query.
 */
export function buildCharBitmap(path) {
    let mask = 0;
    for (const ch of path.toLowerCase()) {
        const code = ch.charCodeAt(0);
        if (code >= 97 && code <= 122) { // 'a' to 'z'
            mask |= 1 << (code - 97);
        }
    }
    return mask;
}
/**
 * Build bitmap for query string
 */
export function buildQueryBitmap(query) {
    return buildCharBitmap(query);
}
/**
 * Check if path could contain all query characters
 */
export function couldMatch(pathBitmap, queryBitmap) {
    // Path must have all bits set that query has
    return (pathBitmap & queryBitmap) === queryBitmap;
}
/**
 * Calculate fuzzy match score for a path
 *
 * Higher score = better match
 */
export function calculateScore(path, query, positions) {
    if (positions.length === 0)
        return 0;
    let score = 0;
    // Bonus for consecutive matches
    for (let i = 1; i < positions.length; i++) {
        if (positions[i].start === positions[i - 1].end) {
            score += 10; // Consecutive bonus
        }
    }
    // Bonus for matches at word boundaries
    for (const pos of positions) {
        const prevChar = pos.start > 0 ? path[pos.start - 1] : ' ';
        if (prevChar === '/' || prevChar === ' ' || prevChar === '-') {
            score += 5; // Word boundary bonus
        }
    }
    // Penalty for length
    score -= path.length * 0.1;
    // Bonus for basename match
    const basename = path.split('/').pop() ?? path;
    if (basename.toLowerCase().includes(query.toLowerCase())) {
        score += 20;
    }
    return score;
}
/**
 * Find match positions using fused indexOf scan
 *
 * Uses SIMD-accelerated String.indexOf instead of manual loops.
 */
export function findMatchPositions(path, query) {
    if (!query)
        return [];
    const positions = [];
    const lowerPath = path.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const queryLen = lowerQuery.length;
    let pos = 0;
    for (let i = 0; i < queryLen; i++) {
        const char = lowerQuery[i];
        const found = lowerPath.indexOf(char, pos);
        if (found === -1) {
            return []; // Character not found, no match possible
        }
        positions.push({ start: found, end: found + 1 });
        pos = found + 1;
    }
    return positions;
}
/**
 * Async file indexer with partial queryability
 */
export class AsyncFileIndexer {
    files = [];
    isIndexing = false;
    resolveQueryable = null;
    queryablePromise;
    constructor() {
        this.queryablePromise = new Promise((resolve) => {
            this.resolveQueryable = resolve;
        });
    }
    /**
     * Start indexing files asynchronously
     *
     * Yields to event loop every few milliseconds to maintain responsiveness.
     */
    async indexFiles(filePaths) {
        if (this.isIndexing) {
            return {
                queryable: this.queryablePromise,
                done: Promise.resolve(this.files.length),
            };
        }
        this.isIndexing = true;
        profileCheckpoint('search_index_start');
        const donePromise = this.runIndexing(filePaths);
        return {
            queryable: this.queryablePromise,
            done: donePromise,
        };
    }
    async runIndexing(filePaths) {
        const startTime = performance.now();
        const firstChunkSize = Math.min(1000, filePaths.length);
        for (let i = 0; i < filePaths.length; i++) {
            const path = filePaths[i];
            this.files.push({
                path,
                lowerPath: path.toLowerCase(),
                charBitmap: buildCharBitmap(path),
            });
            // Branchless modulo for yield check
            if ((i & 0xff) === 0xff) {
                const elapsed = performance.now() - startTime;
                // Yield every ~4ms of work (adaptive to machine speed)
                if (elapsed > 4 * (i + 1)) {
                    await new Promise(resolve => setImmediate(resolve));
                }
            }
            // Resolve queryable after first chunk
            if (i === firstChunkSize - 1 && this.resolveQueryable) {
                this.resolveQueryable();
            }
        }
        if (this.resolveQueryable) {
            this.resolveQueryable();
        }
        profileCheckpoint('search_index_done');
        this.isIndexing = false;
        return this.files.length;
    }
    /**
     * Search indexed files
     */
    search(query, config = {}) {
        const cfg = { ...DEFAULT_CONFIG, ...config };
        const results = [];
        const queryBitmap = buildQueryBitmap(query);
        // Score threshold for early termination
        let minScore = -Infinity;
        for (const file of this.files) {
            // Fast pre-filter: check bitmap
            if (!couldMatch(file.charBitmap, queryBitmap)) {
                continue;
            }
            // Find match positions
            const positions = findMatchPositions(file.path, query);
            if (positions.length === 0) {
                continue;
            }
            // Calculate score
            const score = calculateScore(file.path, query, positions);
            // Score-bound rejection
            if (score < minScore && results.length >= cfg.maxResults) {
                continue;
            }
            results.push({
                path: file.path,
                score,
                matches: positions,
            });
            // Keep top results
            if (results.length > cfg.maxResults) {
                results.sort((a, b) => b.score - a.score);
                results.pop();
                minScore = results.at(-1)?.score ?? -Infinity;
            }
        }
        // Final sort
        results.sort((a, b) => b.score - a.score);
        return results;
    }
    /**
     * Get indexed file count
     */
    getFileCount() {
        return this.files.length;
    }
    /**
     * Check if indexing is complete
     */
    isReady() {
        return !this.isIndexing;
    }
}
/** Global indexer instance */
export const fileIndexer = new AsyncFileIndexer();
/**
 * Simple synchronous search for smaller datasets
 */
export function searchFiles(files, query, maxResults = 50) {
    const queryBitmap = buildQueryBitmap(query);
    const results = [];
    for (const path of files) {
        const fileBitmap = buildCharBitmap(path);
        // Bitmap pre-filter
        if (!couldMatch(fileBitmap, queryBitmap)) {
            continue;
        }
        const positions = findMatchPositions(path, query);
        if (positions.length === 0)
            continue;
        const score = calculateScore(path, query, positions);
        results.push({ path, score, matches: positions });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
}
//# sourceMappingURL=search.js.map