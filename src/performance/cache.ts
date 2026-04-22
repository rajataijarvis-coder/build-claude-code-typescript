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
