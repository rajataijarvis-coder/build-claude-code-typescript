/**
 * VirtualMessageList - virtual scrolling for long message lists.
 * Works with the custom Ink rendering system.
 */
export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}
export interface VirtualMessageListProps {
    messages: Message[];
    rowHeight?: number;
    overscan?: number;
    height: number;
    scrollTop?: number;
}
export interface VirtualItem {
    index: number;
    message: Message;
    top: number;
    height: number;
}
/**
 * Calculate which items should be rendered based on scroll position.
 * Returns the visible items and total height.
 */
export declare function calculateVirtualItems({ messages, rowHeight, overscan, height, scrollTop, }: VirtualMessageListProps): {
    items: VirtualItem[];
    totalHeight: number;
    startIndex: number;
    endIndex: number;
};
/**
 * Check if scroll is at the bottom (for sticky scroll).
 */
export declare function isAtBottom(scrollTop: number, totalHeight: number, containerHeight: number): boolean;
/**
 * Clamp scroll position to valid range.
 */
export declare function clampScroll(scrollTop: number, totalHeight: number, containerHeight: number): number;
/**
 * Scroll to specific message index.
 */
export declare function scrollToIndex(index: number, rowHeight: number, containerHeight: number): number;
//# sourceMappingURL=VirtualMessageList.d.ts.map