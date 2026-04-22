/**
 * Startup Optimizations
 * 
 * Module-level I/O parallelism and deferred loading patterns.
 */

import { performance } from 'node:perf_hooks';
import { profileCheckpoint } from './profiler.js';

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
export function fireAndForget<T>(
  operation: () => Promise<T>,
  onError?: (error: Error) => void
): LazyPromise<T> {
  const lazy: LazyPromise<T> = {
    promise: operation().then(
      (value) => {
        lazy.resolved = true;
        lazy.value = value;
        return value;
      },
      (error) => {
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
        throw error;
      }
    ),
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
export class DeferredLoader<T> {
  private module: T | undefined;
  private loadPromise: Promise<T> | undefined;

  constructor(
    private importFn: () => Promise<T>,
    private moduleName: string
  ) {}

  /**
   * Get the module, loading if necessary
   */
  async get(): Promise<T> {
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
  isLoaded(): boolean {
    return this.module !== undefined;
  }
}

/**
 * Lazy value computation
 * 
 * Compute expensive value only when first accessed,
 * then cache the result.
 */
export function lazy<T>(factory: () => T): () => T {
  let value: T | undefined;
  let computed = false;

  return () => {
    if (!computed) {
      value = factory();
      computed = true;
    }
    return value!;
  };
}

/**
 * Create a memoized version of a function
 * 
 * Results are cached based on arguments using JSON serialization.
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyFn?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Memoize with TTL (time-to-live)
 */
export function memoizeWithTTL<T extends (...args: any[]) => any>(
  fn: T,
  ttlMs: number,
  keyFn?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, { value: ReturnType<T>; expires: number }>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    const now = Date.now();
    
    const cached = cache.get(key);
    if (cached && cached.expires > now) {
      return cached.value;
    }

    const result = fn(...args);
    cache.set(key, { value: result, expires: now + ttlMs });
    return result;
  }) as T;
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
export async function preconnectAPI(apiUrl: string): Promise<void> {
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
  } catch {
    // Preconnection is best-effort; failures are non-fatal
    profileCheckpoint('api_preconnect_failed');
  }
}
