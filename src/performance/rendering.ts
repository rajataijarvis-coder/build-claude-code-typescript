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
export interface ThrottledFunction<T extends (...args: any[]) => any> {
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
    if (typeof (globalThis as any).requestAnimationFrame !== 'undefined') {
      (globalThis as any).requestAnimationFrame(renderFn);
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
    this.pool = new ObjectPool<PooledStyle>(
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
export const FROZEN_EMPTY_ARRAY: readonly unknown[] = Object.freeze([]);
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
