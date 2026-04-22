/**
 * Startup Optimizations
 *
 * Module-level I/O parallelism and deferred loading patterns.
 */
/** Promise for a lazily-loaded value */
export interface LazyPromise<T> {
    promise: Promise<T>;
    resolved: boolean;
    value?: T;
}
/**
 * Fire-and-forget I/O at module level
 *
 * Launch async operations during module initialization
 * so they run in parallel with other module loading.
 */
export declare function fireAndForget<T>(operation: () => Promise<T>, onError?: (error: Error) => void): LazyPromise<T>;
/**
 * Deferred import pattern
 *
 * Heavy modules are loaded via dynamic import() only when needed.
 * This keeps startup path lean.
 */
export declare class DeferredLoader<T> {
    private importFn;
    private moduleName;
    private module;
    private loadPromise;
    constructor(importFn: () => Promise<T>, moduleName: string);
    /**
     * Get the module, loading if necessary
     */
    get(): Promise<T>;
    /**
     * Check if module is loaded
     */
    isLoaded(): boolean;
}
/**
 * Lazy value computation
 *
 * Compute expensive value only when first accessed,
 * then cache the result.
 */
export declare function lazy<T>(factory: () => T): () => T;
/**
 * Create a memoized version of a function
 *
 * Results are cached based on arguments using JSON serialization.
 */
export declare function memoize<T extends (...args: any[]) => any>(fn: T, keyFn?: (...args: Parameters<T>) => string): T;
/**
 * Memoize with TTL (time-to-live)
 */
export declare function memoizeWithTTL<T extends (...args: any[]) => any>(fn: T, ttlMs: number, keyFn?: (...args: Parameters<T>) => string): T;
/**
 * Session-start date memoization
 *
 * Without this, the date changes at midnight, busting the
 * entire cached prompt prefix. A stale date is cosmetic;
 * a cache bust is expensive.
 */
export declare const getSessionStartDate: () => string;
/**
 * API Preconnection
 *
 * Fire HEAD request during initialization to warm TCP+TLS connection.
 * Overlaps with ~135ms of module loading.
 */
export declare function preconnectAPI(apiUrl: string): Promise<void>;
//# sourceMappingURL=startup.d.ts.map