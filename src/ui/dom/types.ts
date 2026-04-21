/**
 * DOM types for custom terminal React reconciler.
 * Maps terminal rendering concepts to element types.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type YogaNode = any;

/**
 * Yoga constants and factory.
 */
export const Yoga = {
  DISPLAY_NONE: 0,
  DISPLAY_FLEX: 1,
  FLEX_DIRECTION_ROW: 0,
  FLEX_DIRECTION_COLUMN: 1,
  WRAP_WRAP: 1,
  WRAP_NO_WRAP: 0,
  EDGE_TOP: 0,
  EDGE_RIGHT: 1,
  EDGE_BOTTOM: 2,
  EDGE_LEFT: 3,
  DIRECTION_LTR: 0,
  Node: {
    create: () => ({
      setDisplay: (_display: number) => {},
      setFlexDirection: (_direction: number) => {},
      setFlexWrap: (_wrap: number) => {},
      setFlexGrow: (_grow: number) => {},
      setFlexShrink: (_shrink: number) => {},
      setWidth: (_width: number) => {},
      setWidthPercent: (_percent: number) => {},
      setHeight: (_height: number) => {},
      setHeightPercent: (_percent: number) => {},
      setPadding: (_edge: number, _value: number) => {},
      insertChild: (_child: YogaNode) => {},
      removeChild: (_child: YogaNode) => {},
      calculateLayout: (_width: number, _height: number, _direction: number) => {},
      getComputedLeft: () => 0,
      getComputedTop: () => 0,
      getComputedWidth: () => 80,
      getComputedHeight: () => 24,
      markDirty: () => {},
      setMeasureFunc: (_fn: () => { width: number; height: number }) => {},
    }),
    destroy: (_node: YogaNode) => {},
  },
};

/**
 * Seven element types for terminal rendering.
 * These map directly to terminal concepts, not HTML.
 */
export enum ElementType {
  ROOT = 'ink-root',        // Document root, one per instance
  BOX = 'ink-box',          // Flexbox container (div equivalent)
  TEXT = 'ink-text',        // Text node with Yoga measure function
  VIRTUAL_TEXT = 'ink-virtual-text', // Nested styled text
  LINK = 'ink-link',        // Hyperlink via OSC 8 sequences
  PROGRESS = 'ink-progress', // Progress indicator
  RAW_ANSI = 'ink-raw-ansi', // Pre-rendered ANSI content
}

/**
 * CSS-like styles mapped to Yoga properties.
 */
export interface Styles {
  // Layout
  display?: 'flex' | 'none';
  flexDirection?: 'row' | 'column';
  flexWrap?: 'wrap' | 'nowrap';
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | string;

  // Alignment
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';

  // Spacing
  padding?: number | string;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;

  margin?: number | string;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;

  // Appearance
  width?: number | string;
  height?: number | string;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;

  // Text
  color?: string;
  backgroundColor?: string;
  fontWeight?: 'normal' | 'bold';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textAlign?: 'left' | 'center' | 'right';

  // Special
  textWrap?: 'wrap' | 'truncate' | 'truncate-start' | 'truncate-middle' | 'truncate-end';
}

/**
 * Text node for leaf content.
 */
export interface TextNode {
  type: 'text';
  content: string;
  style?: Styles;
  parentNode: DOMElement;
}

/**
 * DOM Element carrying state for the rendering pipeline.
 */
export interface DOMElement {
  type: ElementType;
  yogaNode: YogaNode;
  style: Styles;
  attributes: Map<string, unknown>;
  childNodes: (DOMElement | TextNode)[];
  dirty: boolean;
  internal: boolean;
  scrollTop: number;
  scrollLeft: number;
  stickyScroll: boolean;
  parentNode?: DOMElement;

  // Callbacks for Ink integration
  onComputeLayout?: () => void;
  onRender?: () => void;

  // React debug attribution
  debugOwnerChain?: string;
}
