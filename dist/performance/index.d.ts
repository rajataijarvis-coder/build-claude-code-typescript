/**
 * Performance Module
 *
 * Optimizations for startup latency, token efficiency,
 * prompt caching, rendering, and search.
 */
export { profiler, profileCheckpoint, type Checkpoint, type ProfilerConfig, } from './profiler.js';
export { fireAndForget, DeferredLoader, lazy, memoize, memoizeWithTTL, preconnectAPI, getSessionStartDate, } from './startup.js';
export { BudgetManager, budgetManager, DEFAULT_TOOL_BUDGETS, DEFAULT_SLOT_RESERVATION, type ToolBudget, type AggregateBudget, type SlotReservation, } from './budgeting.js';
export { PromptCacheManager, cacheManager, DANGEROUS_uncachedSystemPromptSection, getMemoizedSessionDate, DYNAMIC_BOUNDARY, type CacheScope, type PromptSection, } from './cache.js';
export { AsyncFileIndexer, fileIndexer, buildCharBitmap, buildQueryBitmap, couldMatch, searchFiles, calculateScore, findMatchPositions, type CharBitmap, type SearchResult, type MatchPosition, type IndexedFile, } from './search.js';
export { throttle, FrameScheduler, ObjectPool, StylePool, DamageTracker, frameScheduler, damageTracker, FROZEN_EMPTY_ARRAY, FROZEN_EMPTY_OBJECT, type FrameConfig, type ThrottledFunction, type PooledChar, type PooledStyle, } from './rendering.js';
//# sourceMappingURL=index.d.ts.map