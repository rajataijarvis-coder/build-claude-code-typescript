/**
 * Performance Module
 * 
 * Optimizations for startup latency, token efficiency,
 * prompt caching, rendering, and search.
 */

// Profiling
export {
  profiler,
  profileCheckpoint,
  type Checkpoint,
  type ProfilerConfig,
} from './profiler.js';

// Startup optimizations
export {
  fireAndForget,
  DeferredLoader,
  lazy,
  memoize,
  memoizeWithTTL,
  preconnectAPI,
  getSessionStartDate,
} from './startup.js';

// Budgeting
export {
  BudgetManager,
  budgetManager,
  DEFAULT_TOOL_BUDGETS,
  DEFAULT_SLOT_RESERVATION,
  type ToolBudget,
  type AggregateBudget,
  type SlotReservation,
} from './budgeting.js';

// Caching
export {
  PromptCacheManager,
  cacheManager,
  DANGEROUS_uncachedSystemPromptSection,
  getMemoizedSessionDate,
  DYNAMIC_BOUNDARY,
  type CacheScope,
  type PromptSection,
} from './cache.js';

// Search
export {
  AsyncFileIndexer,
  fileIndexer,
  buildCharBitmap,
  buildQueryBitmap,
  couldMatch,
  searchFiles,
  calculateScore,
  findMatchPositions,
  type CharBitmap,
  type SearchResult,
  type MatchPosition,
  type IndexedFile,
} from './search.js';

// Rendering
export {
  throttle,
  FrameScheduler,
  ObjectPool,
  StylePool,
  DamageTracker,
  frameScheduler,
  damageTracker,
  FROZEN_EMPTY_ARRAY,
  FROZEN_EMPTY_OBJECT,
  type FrameConfig,
  type ThrottledFunction,
  type PooledChar,
  type PooledStyle,
} from './rendering.js';
