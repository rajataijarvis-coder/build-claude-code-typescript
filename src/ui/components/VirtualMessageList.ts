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
export function calculateVirtualItems({
  messages,
  rowHeight = 3,
  overscan = 3,
  height,
  scrollTop = 0,
}: VirtualMessageListProps): { items: VirtualItem[]; totalHeight: number; startIndex: number; endIndex: number } {
  const totalHeight = messages.length * rowHeight;
  const visibleCount = Math.ceil(height / rowHeight);
  
  const start = Math.floor(scrollTop / rowHeight);
  const overscanStart = Math.max(0, start - overscan);
  const end = Math.min(start + visibleCount + overscan, messages.length);
  
  const items: VirtualItem[] = [];
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
export function isAtBottom(scrollTop: number, totalHeight: number, containerHeight: number): boolean {
  return scrollTop >= totalHeight - containerHeight - 1;
}

/**
 * Clamp scroll position to valid range.
 */
export function clampScroll(scrollTop: number, totalHeight: number, containerHeight: number): number {
  return Math.max(0, Math.min(scrollTop, totalHeight - containerHeight));
}

/**
 * Scroll to specific message index.
 */
export function scrollToIndex(index: number, rowHeight: number, containerHeight: number): number {
  return Math.max(0, index * rowHeight - containerHeight / 2);
}
