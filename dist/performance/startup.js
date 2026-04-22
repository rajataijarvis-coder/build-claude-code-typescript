/**
 * Startup Optimizations
 *
 * Module-level I/O parallelism and deferred loading patterns.
 */
import { profileCheckpoint } from './profiler.js';
/**
 * Fire-and-forget I/O at module level
 *
 * Launch async operations during module initialization
 * so they run in parallel with other module loading.
 */
export function fireAndForget(operation, onError) {
    const lazy = {
        promise: operation().then((value) => {
            lazy.resolved = true;
            lazy.value = value;
            return value;
        }, (error) => {
            if (onError) {
                onError(error instanceof Error ? error : new Error(String(error)));
            }
            throw error;
        }),
        resolved: false,
    };
    return lazy;
}
/**
 * Deferred import pattern
 *
 * Heavy modules are loaded via dynamic import() only when needed.
 * This keeps startup path lean.
 */
export class DeferredLoader {
    importFn;
    moduleName;
    module;
    loadPromise;
    constructor(importFn, moduleName) {
        this.importFn = importFn;
        this.moduleName = moduleName;
    }
    /**
     * Get the module, loading if necessary
     */
    async get() {
        if (this.module) {
            return this.module;
        }
        if (this.loadPromise) {
            return this.loadPromise;
        }
        profileCheckpoint(`deferred_load_${this.moduleName}_start`);
        this.loadPromise = this.importFn().then((mod) => {
            this.module = mod;
            profileCheckpoint(`deferred_load_${this.moduleName}_done`);
            return mod;
        });
        return this.loadPromise;
    }
    /**
     * Check if module is loaded
     */
    isLoaded() {
        return this.module !== undefined;
    }
}
/**
 * Lazy value computation
 *
 * Compute expensive value only when first accessed,
 * then cache the result.
 */
export function lazy(factory) {
    let value;
    let computed = false;
    return () => {
        if (!computed) {
            value = factory();
            computed = true;
        }
        return value;
    };
}
/**
 * Create a memoized version of a function
 *
 * Results are cached based on arguments using JSON serialization.
 */
export function memoize(fn, keyFn) {
    const cache = new Map();
    return ((...args) => {
        const key = keyFn ? keyFn(...args) : JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn(...args);
        cache.set(key, result);
        return result;
    });
}
/**
 * Memoize with TTL (time-to-live)
 */
export function memoizeWithTTL(fn, ttlMs, keyFn) {
    const cache = new Map();
    return ((...args) => {
        const key = keyFn ? keyFn(...args) : JSON.stringify(args);
        const now = Date.now();
        const cached = cache.get(key);
        if (cached && cached.expires > now) {
            return cached.value;
        }
        const result = fn(...args);
        cache.set(key, { value: result, expires: now + ttlMs });
        return result;
    });
}
/**
 * Session-start date memoization
 *
 * Without this, the date changes at midnight, busting the
 * entire cached prompt prefix. A stale date is cosmetic;
 * a cache bust is expensive.
 */
export const getSessionStartDate = memoize(() => {
    return new Date().toISOString().split('T')[0];
});
/**
 * API Preconnection
 *
 * Fire HEAD request during initialization to warm TCP+TLS connection.
 * Overlaps with ~135ms of module loading.
 */
export async function preconnectAPI(apiUrl) {
    profileCheckpoint('api_preconnect_start');
    try {
        // Fire HEAD request to warm connection
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch(apiUrl, {
            method: 'HEAD',
            signal: controller.signal,
        });
        clearTimeout(timeout);
        profileCheckpoint('api_preconnect_done');
    }
    catch {
        // Preconnection is best-effort; failures are non-fatal
        profileCheckpoint('api_preconnect_failed');
    }
}
//# sourceMappingURL=startup.js.map