---
title: "Tutorial 17: Performance Optimization"
description: "Startup latency, token efficiency, prompt caching, and search optimization for agentic systems"
part: 7
chapter: 17
slug: "t17-performance"
---

# Tutorial 17: Performance Optimization

## Learning Objectives

By the end of this tutorial, you'll understand:
- **Startup latency optimization** -- Module-level I/O parallelism, deferred imports, API preconnection
- **Token efficiency** -- Slot reservation strategies, result budgeting, context window sizing
- **Prompt caching** -- Cache-stable prompt architecture, sticky latch fields, section memoization
- **Rendering throughput** -- Adaptive throttling, pool-based interning, memory optimization
- **Search optimization** -- Bitmap pre-filters, score-bound rejection, async indexing
- **Speculative execution** -- Streaming tool execution, batch orchestration

## Why Performance Matters

Performance optimization in an agentic system is not one problem. It is five:

1. **Startup latency** -- Time from keystroke to first useful output. Users abandon tools that feel slow.
2. **Token efficiency** -- Fraction of context window consumed by useful content versus overhead.
3. **API cost** -- Dollar amount per turn. Prompt caching can reduce this by 90%.
4. **Rendering throughput** -- Frames per second during streaming. Choppy UIs feel broken.
5. **Search speed** -- Finding files in 270,000+ path codebases on every keystroke.

Claude Code attacks all five with techniques ranging from memoization to 26-bit bitmaps for search pre-filtering.

## Architecture Overview

```mermaid
flowchart TD
    subgraph "Startup Optimization"
        A1[Module I/O Parallelism] --> A2[Deferred Imports]
        A2 --> A3[API Preconnection]
    end
    
    subgraph "Token Efficiency"
        B1[8K Default Slots] --> B2[64K Escalation]
        B2 --> B3[Result Budgeting]
        B3 --> B4[Context Compaction]
    end
    
    subgraph "Prompt Caching"
        C1[Stable Prefix First] --> C2[Volatile Suffix Last]
        C2 --> C3[Sticky Latch Fields]
        C3 --> C4[Section Memoization]
    end
    
    subgraph "Search Optimization"
        D1[26-bit Char Bitmap] --> D2[Score-Bound Rejection]
        D2 --> D3[Fused indexOf Scan]
        D3 --> D4[Async Indexing]
    end
    
    style A1 fill:#e3f2fd
    style B1 fill:#e3f2fd
    style C1 fill:#e3f2fd
    style D1 fill:#e3f2fd
```

## Step 1: Profiling Infrastructure

Before optimizing, we need to measure. Let's create a checkpoint-based profiler.

Create `src/performance/profiler.ts`:

```typescript
/**
 * Performance Profiler
 * 
 * Checkpoint-based profiling for startup and runtime performance.
 * Used to identify bottlenecks before optimizing.
 */

import { performance } from 'node:perf_hooks';

/** Profiling checkpoint data */
export interface Checkpoint {
  name: string;
  timestamp: number;
  elapsed: number;  // ms since start
  delta: number;    // ms since last checkpoint
}

/** Profiler configuration */
export interface ProfilerConfig {
  enabled: boolean;
  sampleRate: number;  // 1.0 = 100%, 0.005 = 0.5%
  maxCheckpoints: number;
}

/** Global profiler state */
class Profiler {
  private checkpoints: Checkpoint[] = [];
  private startTime: number = 0;
  private config: ProfilerConfig = {
    enabled: true,
    sampleRate: 1.0,
    maxCheckpoints: 100,
  };
  private isSampling: boolean = true;

  /**
   * Initialize the profiler
   */
  initialize(config?: Partial<ProfilerConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Determine if this session should be sampled
    this.isSampling = Math.random() < this.config.sampleRate;
    
    if (this.config.enabled && this.isSampling) {
      this.startTime = performance.now();
      this.checkpoints = [];
    }
  }

  /**
   * Record a checkpoint
   */
  checkpoint(name: string): Checkpoint | null {
    if (!this.config.enabled || !this.isSampling) {
      return null;
    }

    const now = performance.now();
    const elapsed = now - this.startTime;
    const lastCheckpoint = this.checkpoints.at(-1);
    const delta = lastCheckpoint ? elapsed - lastCheckpoint.elapsed : 0;

    const checkpoint: Checkpoint = {
      name,
      timestamp: now,
      elapsed,
      delta,
    };

    this.checkpoints.push(checkpoint);

    // Keep within max limit
    if (this.checkpoints.length > this.config.maxCheckpoints) {
      this.checkpoints.shift();
    }

    return checkpoint;
  }

  /**
   * Get all recorded checkpoints
   */
  getCheckpoints(): ReadonlyArray<Checkpoint> {
    return [...this.checkpoints];
  }

  /**
   * Get checkpoint report as formatted string
   */
  getReport(): string {
    if (!this.config.enabled || !this.isSampling) {
      return 'Profiling disabled or not sampled';
    }

    if (this.checkpoints.length === 0) {
      return 'No checkpoints recorded';
    }

    const lines: string[] = [];
    lines.push('═'.repeat(60));
    lines.push('PERFORMANCE PROFILE');
    lines.push('═'.repeat(60));
    lines.push(`Total elapsed: ${this.checkpoints.at(-1)!.elapsed.toFixed(2)}ms`);
    lines.push(`Checkpoints: ${this.checkpoints.length}`);
    lines.push('─'.repeat(60));
    lines.push(`${'Checkpoint'.padEnd(30)} ${'Delta'.padStart(10)} ${'Total'.padStart(10)}`);
    lines.push('─'.repeat(60));

    for (const cp of this.checkpoints) {
      const name = cp.name.length > 28 ? cp.name.slice(0, 28) + '..' : cp.name;
      lines.push(
        `${name.padEnd(30)} ` +
        `${cp.delta.toFixed(2).padStart(8)}ms ` +
        `${cp.elapsed.toFixed(2).padStart(8)}ms`
      );
    }

    lines.push('═'.repeat(60));
    return lines.join('\n');
  }

  /**
   * Reset the profiler
   */
  reset(): void {
    this.checkpoints = [];
    this.startTime = performance.now();
  }
}

// Global profiler instance
export const profiler = new Profiler();

/**
 * Convenience function for recording checkpoints
 */
export function profileCheckpoint(name: string): Checkpoint | null {
  return profiler.checkpoint(name);
}
```

## Step 2: Module-Level I/O Parallelism

The key insight: module loading is CPU-bound, I/O operations are... I/O-bound. Overlap them.

Create `src/performance/startup.ts`:

```typescript
/**
 * Startup Optimizations
 * 
 * Module-level I/O parallelism and deferred loading patterns.
 */

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
```

## Step 3: Token Budgeting and Result Sizing

The context window is the most constrained resource. Let's implement intelligent budgeting.

Create `src/performance/budgeting.ts`:

```typescript
/**
 * Token and Result Budgeting
 * 
 * Manages context window utilization through intelligent
 * slot reservation and result sizing.
 */

/** Budget configuration for a tool */
export interface ToolBudget {
  maxResultSizeChars: number;
  maxResultTokens: number;
}

/** Aggregate budget tracking */
export interface AggregateBudget {
  maxCharsPerMessage: number;
  maxTokensPerConversation: number;
}

/** Budget manager state */
export interface BudgetState {
  toolBudgets: Map<string, ToolBudget>;
  aggregate: AggregateBudget;
  currentConversationChars: number;
  currentConversationTokens: number;
}

/** Default tool budgets based on tool type */
export const DEFAULT_TOOL_BUDGETS: Record<string, ToolBudget> = {
  // Read tool self-bounds via token estimation
  Read: {
    maxResultSizeChars: Infinity,
    maxResultTokens: Infinity,
  },
  // Edit diffs can be large but model needs them
  Edit: {
    maxResultSizeChars: 100_000,
    maxResultTokens: 25_000,
  },
  // Bash output typically moderate
  Bash: {
    maxResultSizeChars: 30_000,
    maxResultTokens: 7_500,
  },
  // Search results with context add up
  Grep: {
    maxResultSizeChars: 100_000,
    maxResultTokens: 25_000,
  },
  // Glob results can be huge in large repos
  Glob: {
    maxResultSizeChars: 50_000,
    maxResultTokens: 12_500,
  },
};

/** Slot reservation configuration */
export interface SlotReservation {
  defaultTokens: number;
  escalationTokens: number;
  escalationThreshold: number;  // truncation rate that triggers escalation
}

/** Default slot reservation: 8K default, 64K escalation */
export const DEFAULT_SLOT_RESERVATION: SlotReservation = {
  defaultTokens: 8_000,
  escalationTokens: 64_000,
  escalationThreshold: 0.01,  // 1% truncation rate
};

/**
 * Budget manager for token and result sizing
 */
export class BudgetManager {
  private state: BudgetState;
  private slotReservation: SlotReservation;
  private truncationCount: number = 0;
  private totalRequests: number = 0;

  constructor(
    customBudgets?: Partial<Record<string, ToolBudget>>,
    slotConfig?: Partial<SlotReservation>
  ) {
    this.state = {
      toolBudgets: new Map(Object.entries({
        ...DEFAULT_TOOL_BUDGETS,
        ...customBudgets,
      })),
      aggregate: {
        maxCharsPerMessage: 200_000,
        maxTokensPerConversation: 500_000,
      },
      currentConversationChars: 0,
      currentConversationTokens: 0,
    };

    this.slotReservation = { ...DEFAULT_SLOT_RESERVATION, ...slotConfig };
  }

  /**
   * Get the appropriate output slot reservation
   * 
   * Default 8K, escalates to 64K on high truncation rate.
   * Production data shows p99 output is 4,911 tokens.
   */
  getOutputSlotReservation(): number {
    const truncationRate = this.totalRequests > 0
      ? this.truncationCount / this.totalRequests
      : 0;

    if (truncationRate > this.slotReservation.escalationThreshold) {
      return this.slotReservation.escalationTokens;
    }

    return this.slotReservation.defaultTokens;
  }

  /**
   * Record a truncation event
   */
  recordTruncation(): void {
    this.truncationCount++;
    this.totalRequests++;
  }

  /**
   * Record successful (non-truncated) completion
   */
  recordSuccess(): void {
    this.totalRequests++;
  }

  /**
   * Get budget for a specific tool
   */
  getToolBudget(toolName: string): ToolBudget {
    return this.state.toolBudgets.get(toolName) ?? {
      maxResultSizeChars: 30_000,
      maxResultTokens: 7_500,
    };
  }

  /**
   * Check if result exceeds tool budget
   */
  exceedsToolBudget(toolName: string, resultChars: number): boolean {
    const budget = this.getToolBudget(toolName);
    return budget.maxResultSizeChars !== Infinity &&
           resultChars > budget.maxResultSizeChars;
  }

  /**
   * Check aggregate conversation budget
   */
  checkAggregateBudget(requestedChars: number): {
    allowed: boolean;
    remaining: number;
  } {
    const remaining = this.state.aggregate.maxCharsPerMessage -
                      this.state.currentConversationChars;
    
    return {
      allowed: requestedChars <= remaining,
      remaining,
    };
  }

  /**
   * Add to conversation usage
   */
  addConversationUsage(chars: number, tokens: number): void {
    this.state.currentConversationChars += chars;
    this.state.currentConversationTokens += tokens;
  }

  /**
   * Persist oversized result to disk
   */
  async persistResult(
    toolName: string,
    result: string,
    persistDir: string
  ): Promise<{ persisted: boolean; path?: string; preview: string }> {
    const budget = this.getToolBudget(toolName);
    
    if (budget.maxResultSizeChars === Infinity ||
        result.length <= budget.maxResultSizeChars) {
      return { persisted: false, preview: result };
    }

    // Create hash for filename
    const crypto = await import('node:crypto');
    const hash = crypto.createHash('sha256').update(result).digest('hex').slice(0, 16);
    const filename = `${toolName.toLowerCase()}_${hash}.txt`;
    const filepath = `${persistDir}/${filename}`;

    // Write full result to disk
    const fs = await import('node:fs/promises');
    await fs.mkdir(persistDir, { recursive: true });
    await fs.writeFile(filepath, result, 'utf-8');

    // Create preview (first 500 chars + indicator)
    const previewLength = 500;
    const preview = result.length > previewLength
      ? result.slice(0, previewLength) + '\n\n... [truncated, full result persisted]'
      : result;

    return {
      persisted: true,
      path: filepath,
      preview,
    };
  }

  /**
   * Get current usage statistics
   */
  getUsageStats(): {
    conversationChars: number;
    conversationTokens: number;
    truncationRate: number;
    currentSlotReservation: number;
  } {
    return {
      conversationChars: this.state.currentConversationChars,
      conversationTokens: this.state.currentConversationTokens,
      truncationRate: this.totalRequests > 0
        ? this.truncationCount / this.totalRequests
        : 0,
      currentSlotReservation: this.getOutputSlotReservation(),
    };
  }

  /**
   * Reset conversation tracking (e.g., after compaction)
   */
  resetConversationTracking(): void {
    this.state.currentConversationChars = 0;
    this.state.currentConversationTokens = 0;
  }
}

/** Global budget manager instance */
export const budgetManager = new BudgetManager();
```

## Step 4: Prompt Cache Architecture

Prompt caching is the highest-impact optimization. Structure your prompt so stable parts come first.

Create `src/performance/cache.ts`:

```typescript
/**
 * Prompt Cache Architecture
 * 
 * Maximizes cache hit rates through stable-first prompt structure
 * and sticky latch fields.
 */

import { memoize, memoizeWithTTL } from './startup.js';

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
export const DYNAMIC_BOUNDARY = '__DYNAMIC_BOUNDARY__';

/**
 * Prompt cache manager
 * 
 * Structures prompt so stable parts come first, volatile last.
 * The API caches on exact prefix matching.
 */
export class PromptCacheManager {
  private sections: Map<string, PromptSection> = new Map();
  private memoizedSections: Map<string, string> = new Map();
  
  // Sticky latch fields - once true, remain true
  private latches: Map<string, boolean> = new Map([
    ['promptCache1hEligible', false],
    ['afkModeHeaderLatched', false],
    ['fastModeHeaderLatched', false],
    ['cacheEditingHeaderLatched', false],
    ['thinkingClearLatched', false],
  ]);

  /**
   * Register a system prompt section
   */
  registerSection(section: PromptSection): void {
    this.sections.set(section.name, section);
  }

  /**
   * Get section content (memoized if configured)
   */
  getSectionContent(name: string): string {
    const section = this.sections.get(name);
    if (!section) {
      return '';
    }

    // Check memoized cache
    if (section.memoized && this.memoizedSections.has(name)) {
      return this.memoizedSections.get(name)!;
    }

    // Compute and optionally memoize
    const content = section.content;
    if (section.memoized) {
      this.memoizedSections.set(name, content);
    }

    return content;
  }

  /**
   * Set a latch field (sticky-once-true)
   */
  setLatch(field: string, value: boolean): void {
    const current = this.latches.get(field) ?? false;
    // Latch is sticky: once true, stays true
    if (!current && value) {
      this.latches.set(field, true);
    }
  }

  /**
   * Get latch value
   */
  getLatch(field: string): boolean {
    return this.latches.get(field) ?? false;
  }

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
  } {
    const globalSections: string[] = [];
    const sessionSections: string[] = [];
    const turnSections: string[] = [];

    for (const [name, section] of this.sections) {
      const content = this.getSectionContent(name);
      
      switch (section.scope) {
        case 'global':
          if (options.useGlobalCache) {
            globalSections.push(content);
          } else {
            // Without global cache, treat as session-scoped
            sessionSections.push(content);
          }
          break;
        case 'session':
          sessionSections.push(content);
          break;
        case 'turn':
          turnSections.push(content);
          break;
      }
    }

    // Build ordered prompt
    const parts: string[] = [
      ...globalSections,
      ...sessionSections,
      DYNAMIC_BOUNDARY,
      `Date: ${options.date}`,
      ...options.memoryFiles.map(f => `Memory: ${f}`),
      ...turnSections,
    ];

    const fullPrompt = parts.join('\n\n');

    // Calculate cacheable prefix (everything before dynamic boundary)
    const boundaryIndex = fullPrompt.indexOf(DYNAMIC_BOUNDARY);
    const cacheablePrefix = boundaryIndex >= 0
      ? fullPrompt.slice(0, boundaryIndex)
      : fullPrompt;
    const volatileSuffix = boundaryIndex >= 0
      ? fullPrompt.slice(boundaryIndex)
      : '';

    return {
      prompt: fullPrompt,
      cacheablePrefix,
      volatileSuffix,
    };
  }

  /**
   * Clear memoized sections (call on /clear or /compact)
   */
  clearMemoizedSections(): void {
    this.memoizedSections.clear();
  }

  /**
   * Estimate cache hit rate based on prefix stability
   */
  estimateCacheHitRate(previousPrompt: string, newPrompt: string): number {
    const previousPrefix = previousPrompt.split(DYNAMIC_BOUNDARY)[0] ?? '';
    const newPrefix = newPrompt.split(DYNAMIC_BOUNDARY)[0] ?? '';
    
    if (previousPrefix === newPrefix) {
      return 1.0;  // 100% cache hit
    }

    // Calculate similarity as rough estimate
    const maxLen = Math.max(previousPrefix.length, newPrefix.length);
    if (maxLen === 0) return 0;

    // Simple character-level similarity
    let matches = 0;
    const minLen = Math.min(previousPrefix.length, newPrefix.length);
    for (let i = 0; i < minLen; i++) {
      if (previousPrefix[i] === newPrefix[i]) {
        matches++;
      }
    }

    return matches / maxLen;
  }
}

/** Global cache manager */
export const cacheManager = new PromptCacheManager();

/**
 * Session date getter with memoization
 * 
 * Prevents date changes at midnight from busting cache.
 */
export const getMemoizedSessionDate = memoize(() => {
  return new Date().toISOString().split('T')[0];
});

/**
 * Dangerous uncached section - forces recomputation every turn
 * 
 * Naming convention forces developers to document why cache-breaking
 * is necessary.
 */
export function DANGEROUS_uncachedSystemPromptSection(
  name: string,
  compute: () => string,
  reason: string
): string {
  // Log the cache-breaking operation
  console.warn(`[Cache Break] Section "${name}" recomputed: ${reason}`);
  return compute();
}
```

## Step 5: Search Optimization

Finding files in 270K+ path codebases needs bitmap pre-filters and async indexing.

Create `src/performance/search.ts`:

```typescript
/**
 * Search Optimization
 * 
 * Bitmap pre-filters, score-bound rejection, and async indexing
 * for fast file search in large codebases.
 */

import { profileCheckpoint } from './profiler.js';

/** Character bitmap for pre-filtering */
export type CharBitmap = number;  // 26-bit mask

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

const DEFAULT_CONFIG: SearchConfig = {
  maxResults: 50,
  caseSensitive: false,
  yieldInterval: 256,  // Power of 2 for branchless modulo
};

/**
 * Build 26-bit character bitmap for a path
 * 
 * Each bit represents presence of a-z in the path.
 * Used for fast rejection of paths that can't match query.
 */
export function buildCharBitmap(path: string): CharBitmap {
  let mask = 0;
  for (const ch of path.toLowerCase()) {
    const code = ch.charCodeAt(0);
    if (code >= 97 && code <= 122) {  // 'a' to 'z'
      mask |= 1 << (code - 97);
    }
  }
  return mask;
}

/**
 * Build bitmap for query string
 */
export function buildQueryBitmap(query: string): CharBitmap {
  return buildCharBitmap(query);
}

/**
 * Check if path could contain all query characters
 */
export function couldMatch(pathBitmap: CharBitmap, queryBitmap: CharBitmap): boolean {
  // Path must have all bits set that query has
  return (pathBitmap & queryBitmap) === queryBitmap;
}

/**
 * Calculate fuzzy match score for a path
 * 
 * Higher score = better match
 */
export function calculateScore(
  path: string,
  query: string,
  positions: MatchPosition[]
): number {
  if (positions.length === 0) return 0;

  let score = 0;

  // Bonus for consecutive matches
  for (let i = 1; i < positions.length; i++) {
    if (positions[i].start === positions[i - 1].end) {
      score += 10;  // Consecutive bonus
    }
  }

  // Bonus for matches at word boundaries
  for (const pos of positions) {
    const prevChar = pos.start > 0 ? path[pos.start - 1] : ' ';
    if (prevChar === '/' || prevChar === ' ' || prevChar === '-') {
      score += 5;  // Word boundary bonus
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
export function findMatchPositions(
  path: string,
  query: string
): MatchPosition[] {
  if (!query) return [];

  const positions: MatchPosition[] = [];
  const lowerPath = path.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const queryLen = lowerQuery.length;

  let pos = 0;
  for (let i = 0; i < queryLen; i++) {
    const char = lowerQuery[i];
    const found = lowerPath.indexOf(char, pos);
    
    if (found === -1) {
      return [];  // Character not found, no match possible
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
  private files: IndexedFile[] = [];
  private isIndexing: boolean = false;
  private resolveQueryable: (() => void) | null = null;
  private queryablePromise: Promise<void>;

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
  async indexFiles(filePaths: string[]): Promise<{
    queryable: Promise<void>;
    done: Promise<number>;
  }> {
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

  private async runIndexing(filePaths: string[]): Promise<number> {
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
  search(query: string, config: Partial<SearchConfig> = {}): SearchResult[] {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const results: SearchResult[] = [];
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
  getFileCount(): number {
    return this.files.length;
  }

  /**
   * Check if indexing is complete
   */
  isReady(): boolean {
    return !this.isIndexing;
  }
}

/** Global indexer instance */
export const fileIndexer = new AsyncFileIndexer();

/**
 * Simple synchronous search for smaller datasets
 */
export function searchFiles(
  files: string[],
  query: string,
  maxResults: number = 50
): SearchResult[] {
  const queryBitmap = buildQueryBitmap(query);
  const results: SearchResult[] = [];

  for (const path of files) {
    const fileBitmap = buildCharBitmap(path);
    
    // Bitmap pre-filter
    if (!couldMatch(fileBitmap, queryBitmap)) {
      continue;
    }

    const positions = findMatchPositions(path, query);
    if (positions.length === 0) continue;

    const score = calculateScore(path, query, positions);
    results.push({ path, score, matches: positions });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxResults);
}
```

## Step 6: Streaming and Adaptive Throttling

Rendering performance requires adaptive throttling and pool-based memory management.

Create `src/performance/rendering.ts`:

```typescript
/**
 * Rendering Performance
 * 
 * Adaptive throttling, pool-based interning, and memory optimization
 * for terminal UI rendering.
 */

import { profileCheckpoint } from './profiler.js';

/** Frame timing configuration */
export interface FrameConfig {
  /** Target FPS when focused */
  focusedFPS: number;
  /** Target FPS when blurred */
  blurredFPS: number;
  /** Scroll drain frame interval (fraction of normal) */
  scrollDrainFactor: number;
}

const DEFAULT_FRAME_CONFIG: FrameConfig = {
  focusedFPS: 60,
  blurredFPS: 30,
  scrollDrainFactor: 0.25,  // 4x faster during scroll
};

/** Throttled function wrapper */
interface ThrottledFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel(): void;
  flush(): ReturnType<T> | undefined;
}

/**
 * Create a throttled function
 * 
 * Executes at most once per frame interval.
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  intervalMs: number
): ThrottledFunction<T> {
  let lastRun = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingArgs: Parameters<T> | null = null;

  const throttled = (...args: Parameters<T>): void => {
    const now = performance.now();
    const elapsed = now - lastRun;

    if (elapsed >= intervalMs) {
      // Execute immediately
      lastRun = now;
      fn(...args);
    } else {
      // Schedule for later
      pendingArgs = args;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (pendingArgs) {
          lastRun = performance.now();
          fn(...pendingArgs);
          pendingArgs = null;
        }
      }, intervalMs - elapsed);
    }
  };

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    pendingArgs = null;
  };

  throttled.flush = () => {
    if (pendingArgs) {
      throttled.cancel();
      lastRun = performance.now();
      return fn(...pendingArgs);
    }
    return undefined;
  };

  return throttled;
}

/**
 * Adaptive frame scheduler
 */
export class FrameScheduler {
  private config: FrameConfig;
  private isFocused: boolean = true;
  private isScrolling: boolean = false;

  constructor(config?: Partial<FrameConfig>) {
    this.config = { ...DEFAULT_FRAME_CONFIG, ...config };
  }

  /**
   * Get current frame interval based on state
   */
  getFrameInterval(): number {
    if (this.isScrolling) {
      return 1000 / (this.config.focusedFPS / this.config.scrollDrainFactor);
    }
    if (this.isFocused) {
      return 1000 / this.config.focusedFPS;
    }
    return 1000 / this.config.blurredFPS;
  }

  /**
   * Set focus state
   */
  setFocused(focused: boolean): void {
    this.isFocused = focused;
  }

  /**
   * Set scrolling state
   */
  setScrolling(scrolling: boolean): void {
    this.isScrolling = scrolling;
  }

  /**
   * Schedule a render frame
   */
  scheduleRender(renderFn: () => void): void {
    const interval = this.getFrameInterval();
    
    // Use requestAnimationFrame in browser, setTimeout in Node
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(renderFn);
    } else {
      setTimeout(renderFn, interval);
    }
  }
}

/** Object pool for reusing allocations */
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    initialSize: number = 10
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;

    // Pre-allocate initial objects
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }

  /**
   * Acquire an object from the pool
   */
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  /**
   * Release an object back to the pool
   */
  release(obj: T): void {
    this.resetFn(obj);
    this.pool.push(obj);
  }

  /**
   * Get pool size
   */
  size(): number {
    return this.pool.length;
  }
}

/** Char pool for terminal cells */
export interface PooledChar {
  char: string;
  style: number;
  hyperlink: number | null;
}

/** Style pool entry */
export interface PooledStyle {
  fg: number;
  bg: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

/**
 * Style pool using interning
 * 
 * Common styles are shared via a hash map, reducing allocations.
 */
export class StylePool {
  private styles = new Map<string, PooledStyle>();
  private pool: ObjectPool<PooledStyle>;

  constructor() {
    this.pool = new ObjectPool(
      () => ({ fg: 0, bg: 0, bold: false, italic: false, underline: false }),
      (s) => { s.fg = 0; s.bg = 0; s.bold = false; s.italic = false; s.underline = false; },
      100
    );
  }

  /**
   * Get or create a style
   */
  getStyle(key: string, properties: Partial<PooledStyle>): PooledStyle {
    const existing = this.styles.get(key);
    if (existing) return existing;

    const style = this.pool.acquire();
    Object.assign(style, properties);
    this.styles.set(key, style);
    return style;
  }
}

/**
 * Pre-allocated frozen objects
 * 
 * Eliminates allocations for common render-path values.
 */
export const FROZEN_EMPTY_ARRAY = Object.freeze([]) as unknown[];
export const FROZEN_EMPTY_OBJECT = Object.freeze({});

/**
 * Cell-level damage tracking
 * 
 * Only re-render cells that changed.
 */
export class DamageTracker {
  private previousCells: Map<string, string> = new Map();
  private dirtyRegions: Array<{ x: number; y: number; width: number; height: number }> = [];

  /**
   * Mark a region as dirty
   */
  markDirty(x: number, y: number, width: number, height: number): void {
    this.dirtyRegions.push({ x, y, width, height });
  }

  /**
   * Check if a cell has changed
   */
  hasChanged(key: string, content: string): boolean {
    const previous = this.previousCells.get(key);
    if (previous !== content) {
      this.previousCells.set(key, content);
      return true;
    }
    return false;
  }

  /**
   * Get dirty regions and clear
   */
  getDirtyRegions(): Array<{ x: number; y: number; width: number; height: number }> {
    const regions = [...this.dirtyRegions];
    this.dirtyRegions = [];
    return regions;
  }

  /**
   * Clear all tracking
   */
  clear(): void {
    this.previousCells.clear();
    this.dirtyRegions = [];
  }
}

/** Global frame scheduler */
export const frameScheduler = new FrameScheduler();

/** Global damage tracker */
export const damageTracker = new DamageTracker();
```

## Step 7: Integration

Let's create the index file and update the main entry point.

Create `src/performance/index.ts`:

```typescript
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
```

Now let's update the main entry point to use performance optimizations.

Update `src/main.ts`:

```typescript
/**
 * Main Orchestrator with Performance Optimizations
 * 
 * Validates prerequisites and delegates to the appropriate handler.
 * Includes startup profiling and I/O parallelism.
 */

import {
  profileCheckpoint,
  fireAndForget,
  preconnectAPI,
  getSessionStartDate,
} from './performance/index.js';

// Initialize profiler early
profileCheckpoint('main_tsx_entry');

// Fire-and-forget I/O operations during module loading
const apiPreconnect = fireAndForget(
  () => preconnectAPI('https://api.anthropic.com'),
  () => {}  // Best effort, failures are non-fatal
);

import { init, AppContext } from './init.js';
import { setup } from './setup.js';
import { launchRepl } from './replLauncher.js';
import { ParsedArgs } from './args.js';

/**
 * Main Entry Point
 */
export async function main(args: ParsedArgs): Promise<void> {
  profileCheckpoint('main_start');
  
  console.log('🚀 Starting Claude Code...');
  console.log('  📅 Session date:', getSessionStartDate());
  
  // Validate prerequisites
  if (!await checkPrerequisites()) {
    throw new Error('Prerequisites check failed');
  }
  profileCheckpoint('prerequisites_done');
  
  // Step 1: Initialize singletons
  const context = await init(args);
  profileCheckpoint('init_done');
  
  // Step 2: One-time setup
  await setup(context);
  profileCheckpoint('setup_done');
  
  // Step 3: Launch appropriate interface
  if (args.print) {
    await runNonInteractive(context, args);
  } else {
    await launchRepl(context);
  }
  
  profileCheckpoint('main_complete');
  
  // Print performance report in debug mode
  if (args.debug) {
    const { profiler } = await import('./performance/index.js');
    console.log(profiler.getReport());
  }
}

async function checkPrerequisites(): Promise<boolean> {
  // Check Node.js version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (major < 18) {
    console.error('❌ Node.js 18+ required, found:', nodeVersion);
    return false;
  }
  
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY environment variable required');
    console.error('   Set it with: export ANTHROPIC_API_KEY=your_key_here');
    return false;
  }
  
  console.log('  ✅ Prerequisites check passed');
  return true;
}

async function runNonInteractive(context: AppContext, args: ParsedArgs): Promise<void> {
  console.log('Non-interactive mode not yet implemented');
  console.log('Arguments:', args);
}
```

## Step 8: Testing

Create a test file for the performance module.

Create `src/performance/__tests__/search.test.ts`:

```typescript
/**
 * Search Performance Tests
 */

import {
  buildCharBitmap,
  buildQueryBitmap,
  couldMatch,
  calculateScore,
  findMatchPositions,
  searchFiles,
} from '../search.js';

describe('Search Bitmap Functions', () => {
  test('buildCharBitmap creates correct mask', () => {
    const bitmap = buildCharBitmap('abc');
    expect(bitmap).toBe(0b00000000000000000000000111);  // bits 0, 1, 2
  });

  test('buildCharBitmap ignores non-lowercase', () => {
    const bitmap = buildCharBitmap('ABC-123!');
    expect(bitmap).toBe(0);  // No lowercase letters
  });

  test('couldMatch returns true for matching bitmaps', () => {
    const pathBitmap = buildCharBitmap('src/components/Button.tsx');
    const queryBitmap = buildQueryBitmap('btn');
    expect(couldMatch(pathBitmap, queryBitmap)).toBe(true);
  });

  test('couldMatch returns false for missing characters', () => {
    const pathBitmap = buildCharBitmap('src/main.ts');
    const queryBitmap = buildQueryBitmap('xyz');  // Not in path
    expect(couldMatch(pathBitmap, queryBitmap)).toBe(false);
  });
});

describe('Search Scoring', () => {
  test('calculateScore rewards basename matches', () => {
    const positions = [{ start: 4, end: 8 }];
    const score = calculateScore('src/utils/logger.ts', 'logger', positions);
    expect(score).toBeGreaterThan(0);
  });

  test('calculateScore rewards consecutive matches', () => {
    const positions = [
      { start: 0, end: 1 },
      { start: 1, end: 2 },  // Consecutive
    ];
    const score = calculateScore('abcdef', 'ab', positions);
    expect(score).toBeGreaterThan(10);  // Consecutive bonus
  });
});

describe('Search Files', () => {
  const files = [
    'src/components/Button.tsx',
    'src/components/Input.tsx',
    'src/utils/logger.ts',
    'src/utils/helpers.ts',
    'README.md',
  ];

  test('searchFiles returns results', () => {
    const results = searchFiles(files, 'button', 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].path).toContain('Button');
  });

  test('searchFiles respects maxResults', () => {
    const results = searchFiles(files, 'src', 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  test('searchFiles handles no matches', () => {
    const results = searchFiles(files, 'xyz123', 10);
    expect(results.length).toBe(0);
  });
});
```

## Summary

In this tutorial, we implemented:

1. **Profiling infrastructure** - Checkpoint-based measurement
2. **Startup optimization** - Module-level I/O parallelism, deferred imports
3. **Token budgeting** - 8K→64K slot escalation, result sizing
4. **Prompt caching** - Stable-first architecture, sticky latches
5. **Search optimization** - 26-bit bitmap pre-filters, async indexing
6. **Rendering** - Adaptive throttling, pool-based interning

These optimizations reduce startup latency, maximize context window usage, minimize API costs, and keep the UI responsive even under heavy load.

## Key Patterns

- **Fail-measurable** - Profile before optimizing
- **Cache-stability** - Stable prefixes first, volatile suffixes last
- **Bitmap pre-filters** - Cheap rejection before expensive scoring
- **Sticky latches** - Sacrifice flexibility to preserve cache
- **Object pooling** - Reuse over allocate

## Next Steps

In Tutorial 18, we'll integrate all components into a complete working agent with testing and deployment strategies.
