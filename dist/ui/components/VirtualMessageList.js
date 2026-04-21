/**
 * VirtualMessageList - virtual scrolling for long message lists.
 * Works with the custom Ink rendering system.
 */
/**
 * Calculate which items should be rendered based on scroll position.
 * Returns the visible items and total height.
 */
export function calculateVirtualItems({ messages, rowHeight = 3, overscan = 3, height, scrollTop = 0, }) {
    const totalHeight = messages.length * rowHeight;
    const visibleCount = Math.ceil(height / rowHeight);
    const start = Math.floor(scrollTop / rowHeight);
    const overscanStart = Math.max(0, start - overscan);
    const end = Math.min(start + visibleCount + overscan, messages.length);
    const items = [];
    for (let i = overscanStart; i < end; i++) {
        items.push({
            index: i,
            message: messages[i],
            top: i * rowHeight,
            height: rowHeight,
        });
    }
    return {
        items,
        totalHeight,
        startIndex: overscanStart,
        endIndex: end,
    };
}
/**
 * Check if scroll is at the bottom (for sticky scroll).
 */
export function isAtBottom(scrollTop, totalHeight, containerHeight) {
    return scrollTop >= totalHeight - containerHeight - 1;
}
/**
 * Clamp scroll position to valid range.
 */
export function clampScroll(scrollTop, totalHeight, containerHeight) {
    return Math.max(0, Math.min(scrollTop, totalHeight - containerHeight));
}
/**
 * Scroll to specific message index.
 */
export function scrollToIndex(index, rowHeight, containerHeight) {
    return Math.max(0, index * rowHeight - containerHeight / 2);
}
//# sourceMappingURL=VirtualMessageList.js.map