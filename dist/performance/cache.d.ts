/**
 * Prompt Cache Architecture
 *
 * Maximizes cache hit rates through stable-first prompt structure
 * and sticky latch fields.
 */
/** Cache scope for system prompt entries */
export type CacheScope = 'global' | 'session' | 'turn';
/** System prompt section */
export interface PromptSection {
    name: string;
    content: string;
    scope: CacheScope;
    /** If true, this section's content is memoized until /clear */
    memoized?: boolean;
}
/** Dynamic boundary marker */
export declare const DYNAMIC_BOUNDARY = "__DYNAMIC_BOUNDARY__";
/**
 * Prompt cache manager
 *
 * Structures prompt so stable parts come first, volatile last.
 * The API caches on exact prefix matching.
 */
export declare class PromptCacheManager {
    private sections;
    private memoizedSections;
    private latches;
    /**
     * Register a system prompt section
     */
    registerSection(section: PromptSection): void;
    /**
     * Get section content (memoized if configured)
     */
    getSectionContent(name: string): string;
    /**
     * Set a latch field (sticky-once-true)
     */
    setLatch(field: string, value: boolean): void;
    /**
     * Get latch value
     */
    getLatch(field: string): boolean;
    /**
     * Build the complete system prompt
     *
     * Order: global scope → session scope → dynamic boundary → turn scope
     */
    buildSystemPrompt(options: {
        useGlobalCache?: boolean;
        date: string;
        memoryFiles: string[];
    }): {
        prompt: string;
        cacheablePrefix: string;
        volatileSuffix: string;
    };
    /**
     * Clear memoized sections (call on /clear or /compact)
     */
    clearMemoizedSections(): void;
    /**
     * Estimate cache hit rate based on prefix stability
     */
    estimateCacheHitRate(previousPrompt: string, newPrompt: string): number;
}
/** Global cache manager */
export declare const cacheManager: PromptCacheManager;
/**
 * Session date getter with memoization
 *
 * Prevents date changes at midnight from busting cache.
 */
export declare const getMemoizedSessionDate: () => string;
/**
 * Dangerous uncached section - forces recomputation every turn
 *
 * Naming convention forces developers to document why cache-breaking
 * is necessary.
 */
export declare function DANGEROUS_uncachedSystemPromptSection(name: string, compute: () => string, reason: string): string;
//# sourceMappingURL=cache.d.ts.map