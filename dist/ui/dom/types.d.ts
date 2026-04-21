/**
 * DOM types for custom terminal React reconciler.
 * Maps terminal rendering concepts to element types.
 */
export type YogaNode = any;
/**
 * Yoga constants and factory.
 */
export declare const Yoga: {
    DISPLAY_NONE: number;
    DISPLAY_FLEX: number;
    FLEX_DIRECTION_ROW: number;
    FLEX_DIRECTION_COLUMN: number;
    WRAP_WRAP: number;
    WRAP_NO_WRAP: number;
    EDGE_TOP: number;
    EDGE_RIGHT: number;
    EDGE_BOTTOM: number;
    EDGE_LEFT: number;
    DIRECTION_LTR: number;
    Node: {
        create: () => {
            setDisplay: (_display: number) => void;
            setFlexDirection: (_direction: number) => void;
            setFlexWrap: (_wrap: number) => void;
            setFlexGrow: (_grow: number) => void;
            setFlexShrink: (_shrink: number) => void;
            setWidth: (_width: number) => void;
            setWidthPercent: (_percent: number) => void;
            setHeight: (_height: number) => void;
            setHeightPercent: (_percent: number) => void;
            setPadding: (_edge: number, _value: number) => void;
            insertChild: (_child: YogaNode) => void;
            removeChild: (_child: YogaNode) => void;
            calculateLayout: (_width: number, _height: number, _direction: number) => void;
            getComputedLeft: () => number;
            getComputedTop: () => number;
            getComputedWidth: () => number;
            getComputedHeight: () => number;
            markDirty: () => void;
            setMeasureFunc: (_fn: () => {
                width: number;
                height: number;
            }) => void;
        };
        destroy: (_node: YogaNode) => void;
    };
};
/**
 * Seven element types for terminal rendering.
 * These map directly to terminal concepts, not HTML.
 */
export declare enum ElementType {
    ROOT = "ink-root",// Document root, one per instance
    BOX = "ink-box",// Flexbox container (div equivalent)
    TEXT = "ink-text",// Text node with Yoga measure function
    VIRTUAL_TEXT = "ink-virtual-text",// Nested styled text
    LINK = "ink-link",// Hyperlink via OSC 8 sequences
    PROGRESS = "ink-progress",// Progress indicator
    RAW_ANSI = "ink-raw-ansi"
}
/**
 * CSS-like styles mapped to Yoga properties.
 */
export interface Styles {
    display?: 'flex' | 'none';
    flexDirection?: 'row' | 'column';
    flexWrap?: 'wrap' | 'nowrap';
    flexGrow?: number;
    flexShrink?: number;
    flexBasis?: number | string;
    alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
    justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
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
    width?: number | string;
    height?: number | string;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    color?: string;
    backgroundColor?: string;
    fontWeight?: 'normal' | 'bold';
    textDecoration?: 'none' | 'underline' | 'line-through';
    textAlign?: 'left' | 'center' | 'right';
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
    onComputeLayout?: () => void;
    onRender?: () => void;
    debugOwnerChain?: string;
}
//# sourceMappingURL=types.d.ts.map