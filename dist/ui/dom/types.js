/**
 * DOM types for custom terminal React reconciler.
 * Maps terminal rendering concepts to element types.
 */
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
            setDisplay: (_display) => { },
            setFlexDirection: (_direction) => { },
            setFlexWrap: (_wrap) => { },
            setFlexGrow: (_grow) => { },
            setFlexShrink: (_shrink) => { },
            setWidth: (_width) => { },
            setWidthPercent: (_percent) => { },
            setHeight: (_height) => { },
            setHeightPercent: (_percent) => { },
            setPadding: (_edge, _value) => { },
            insertChild: (_child) => { },
            removeChild: (_child) => { },
            calculateLayout: (_width, _height, _direction) => { },
            getComputedLeft: () => 0,
            getComputedTop: () => 0,
            getComputedWidth: () => 80,
            getComputedHeight: () => 24,
            markDirty: () => { },
            setMeasureFunc: (_fn) => { },
        }),
        destroy: (_node) => { },
    },
};
/**
 * Seven element types for terminal rendering.
 * These map directly to terminal concepts, not HTML.
 */
export var ElementType;
(function (ElementType) {
    ElementType["ROOT"] = "ink-root";
    ElementType["BOX"] = "ink-box";
    ElementType["TEXT"] = "ink-text";
    ElementType["VIRTUAL_TEXT"] = "ink-virtual-text";
    ElementType["LINK"] = "ink-link";
    ElementType["PROGRESS"] = "ink-progress";
    ElementType["RAW_ANSI"] = "ink-raw-ansi";
})(ElementType || (ElementType = {}));
//# sourceMappingURL=types.js.map