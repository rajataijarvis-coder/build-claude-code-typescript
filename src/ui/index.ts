/**
 * UI module exports.
 */

export { Ink } from './Ink.js';

// Components (React components - requires JSX)
// export { Box } from './components/Box.js';
// export { Text } from './components/Text.js';
// export { Newline } from './components/Newline.js';

// Virtual scrolling utilities
export { 
  VirtualMessageListProps,
  VirtualItem,
  Message,
  calculateVirtualItems,
  isAtBottom,
  clampScroll,
  scrollToIndex,
} from './components/VirtualMessageList.js';

// Input system
export * from './input/index.js';

// DOM types
export * from './dom/types.js';
