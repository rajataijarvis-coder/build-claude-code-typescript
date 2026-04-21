/**
 * Memory Staleness System
 *
 * Treat old memories as hypotheses, not facts.
 */
/**
 * Calculate human-readable staleness warning
 *
 * Memories from today or yesterday get no warning.
 * Everything older gets a caveat injected alongside content.
 */
export declare function calculateStaleness(mtime: number): string;
/**
 * Wrap memory content with staleness warning if applicable
 */
export declare function wrapWithStaleness(content: string, mtime: number): string;
/**
 * Get staleness level for UI display
 */
export type StalenessLevel = 'fresh' | 'recent' | 'stale' | 'ancient';
export declare function getStalenessLevel(mtime: number): StalenessLevel;
/**
 * Get emoji indicator for staleness level
 */
export declare function getStalenessEmoji(level: StalenessLevel): string;
//# sourceMappingURL=staleness.d.ts.map