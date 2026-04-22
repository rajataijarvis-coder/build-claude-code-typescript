/**
 * Rendering Performance
 *
 * Adaptive throttling, pool-based interning, and memory optimization
 * for terminal UI rendering.
 */
/** Frame timing configuration */
export interface FrameConfig {
    /** Target FPS when focused */
    focusedFPS: number;
    /** Target FPS when blurred */
    blurredFPS: number;
    /** Scroll drain frame interval (fraction of normal) */
    scrollDrainFactor: number;
}
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
export declare function throttle<T extends (...args: any[]) => any>(fn: T, intervalMs: number): ThrottledFunction<T>;
/**
 * Adaptive frame scheduler
 */
export declare class FrameScheduler {
    private config;
    private isFocused;
    private isScrolling;
    constructor(config?: Partial<FrameConfig>);
    /**
     * Get current frame interval based on state
     */
    getFrameInterval(): number;
    /**
     * Set focus state
     */
    setFocused(focused: boolean): void;
    /**
     * Set scrolling state
     */
    setScrolling(scrolling: boolean): void;
    /**
     * Schedule a render frame
     */
    scheduleRender(renderFn: () => void): void;
}
/** Object pool for reusing allocations */
export declare class ObjectPool<T> {
    private pool;
    private createFn;
    private resetFn;
    constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize?: number);
    /**
     * Acquire an object from the pool
     */
    acquire(): T;
    /**
     * Release an object back to the pool
     */
    release(obj: T): void;
    /**
     * Get pool size
     */
    size(): number;
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
export declare class StylePool {
    private styles;
    private pool;
    constructor();
    /**
     * Get or create a style
     */
    getStyle(key: string, properties: Partial<PooledStyle>): PooledStyle;
}
/**
 * Pre-allocated frozen objects
 *
 * Eliminates allocations for common render-path values.
 */
export declare const FROZEN_EMPTY_ARRAY: readonly unknown[];
export declare const FROZEN_EMPTY_OBJECT: Readonly<{}>;
/**
 * Cell-level damage tracking
 *
 * Only re-render cells that changed.
 */
export declare class DamageTracker {
    private previousCells;
    private dirtyRegions;
    /**
     * Mark a region as dirty
     */
    markDirty(x: number, y: number, width: number, height: number): void;
    /**
     * Check if a cell has changed
     */
    hasChanged(key: string, content: string): boolean;
    /**
     * Get dirty regions and clear
     */
    getDirtyRegions(): Array<{
        x: number;
        y: number;
        width: number;
        height: number;
    }>;
    /**
     * Clear all tracking
     */
    clear(): void;
}
/** Global frame scheduler */
export declare const frameScheduler: FrameScheduler;
/** Global damage tracker */
export declare const damageTracker: DamageTracker;
//# sourceMappingURL=rendering.d.ts.map