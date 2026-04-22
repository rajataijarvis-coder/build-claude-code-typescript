/**
 * Performance Module
 *
 * Optimizations for startup latency, token efficiency,
 * prompt caching, rendering, and search.
 */
// Profiling
export { profiler, profileCheckpoint, } from './profiler.js';
// Startup optimizations
export { fireAndForget, DeferredLoader, lazy, memoize, memoizeWithTTL, preconnectAPI, getSessionStartDate, } from './startup.js';
// Budgeting
export { BudgetManager, budgetManager, DEFAULT_TOOL_BUDGETS, DEFAULT_SLOT_RESERVATION, } from './budgeting.js';
// Caching
export { PromptCacheManager, cacheManager, DANGEROUS_uncachedSystemPromptSection, getMemoizedSessionDate, DYNAMIC_BOUNDARY, } from './cache.js';
// Search
export { AsyncFileIndexer, fileIndexer, buildCharBitmap, buildQueryBitmap, couldMatch, searchFiles, calculateScore, findMatchPositions, } from './search.js';
// Rendering
export { throttle, FrameScheduler, ObjectPool, StylePool, DamageTracker, frameScheduler, damageTracker, FROZEN_EMPTY_ARRAY, FROZEN_EMPTY_OBJECT, } from './rendering.js';
//# sourceMappingURL=index.js.map