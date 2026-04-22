/**
 * Rendering Performance
 *
 * Adaptive throttling, pool-based interning, and memory optimization
 * for terminal UI rendering.
 */
const DEFAULT_FRAME_CONFIG = {
    focusedFPS: 60,
    blurredFPS: 30,
    scrollDrainFactor: 0.25, // 4x faster during scroll
};
/**
 * Create a throttled function
 *
 * Executes at most once per frame interval.
 */
export function throttle(fn, intervalMs) {
    let lastRun = 0;
    let timeoutId = null;
    let pendingArgs = null;
    const throttled = (...args) => {
        const now = performance.now();
        const elapsed = now - lastRun;
        if (elapsed >= intervalMs) {
            // Execute immediately
            lastRun = now;
            fn(...args);
        }
        else {
            // Schedule for later
            pendingArgs = args;
            if (timeoutId)
                clearTimeout(timeoutId);
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
    config;
    isFocused = true;
    isScrolling = false;
    constructor(config) {
        this.config = { ...DEFAULT_FRAME_CONFIG, ...config };
    }
    /**
     * Get current frame interval based on state
     */
    getFrameInterval() {
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
    setFocused(focused) {
        this.isFocused = focused;
    }
    /**
     * Set scrolling state
     */
    setScrolling(scrolling) {
        this.isScrolling = scrolling;
    }
    /**
     * Schedule a render frame
     */
    scheduleRender(renderFn) {
        const interval = this.getFrameInterval();
        // Use requestAnimationFrame in browser, setTimeout in Node
        if (typeof globalThis.requestAnimationFrame !== 'undefined') {
            globalThis.requestAnimationFrame(renderFn);
        }
        else {
            setTimeout(renderFn, interval);
        }
    }
}
/** Object pool for reusing allocations */
export class ObjectPool {
    pool = [];
    createFn;
    resetFn;
    constructor(createFn, resetFn, initialSize = 10) {
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
    acquire() {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        return this.createFn();
    }
    /**
     * Release an object back to the pool
     */
    release(obj) {
        this.resetFn(obj);
        this.pool.push(obj);
    }
    /**
     * Get pool size
     */
    size() {
        return this.pool.length;
    }
}
/**
 * Style pool using interning
 *
 * Common styles are shared via a hash map, reducing allocations.
 */
export class StylePool {
    styles = new Map();
    pool;
    constructor() {
        this.pool = new ObjectPool(() => ({ fg: 0, bg: 0, bold: false, italic: false, underline: false }), (s) => { s.fg = 0; s.bg = 0; s.bold = false; s.italic = false; s.underline = false; }, 100);
    }
    /**
     * Get or create a style
     */
    getStyle(key, properties) {
        const existing = this.styles.get(key);
        if (existing)
            return existing;
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
export const FROZEN_EMPTY_ARRAY = Object.freeze([]);
export const FROZEN_EMPTY_OBJECT = Object.freeze({});
/**
 * Cell-level damage tracking
 *
 * Only re-render cells that changed.
 */
export class DamageTracker {
    previousCells = new Map();
    dirtyRegions = [];
    /**
     * Mark a region as dirty
     */
    markDirty(x, y, width, height) {
        this.dirtyRegions.push({ x, y, width, height });
    }
    /**
     * Check if a cell has changed
     */
    hasChanged(key, content) {
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
    getDirtyRegions() {
        const regions = [...this.dirtyRegions];
        this.dirtyRegions = [];
        return regions;
    }
    /**
     * Clear all tracking
     */
    clear() {
        this.previousCells.clear();
        this.dirtyRegions = [];
    }
}
/** Global frame scheduler */
export const frameScheduler = new FrameScheduler();
/** Global damage tracker */
export const damageTracker = new DamageTracker();
//# sourceMappingURL=rendering.js.map