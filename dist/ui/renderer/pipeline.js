/**
 * DOM-to-screen rendering implementation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    Node: {
        create: () => ({
            setDisplay: () => { },
            setFlexDirection: () => { },
            setFlexWrap: () => { },
            setFlexGrow: () => { },
            setFlexShrink: () => { },
            setWidth: () => { },
            setWidthPercent: () => { },
            setHeight: () => { },
            setHeightPercent: () => { },
            setPadding: () => { },
            insertChild: () => { },
            removeChild: () => { },
            calculateLayout: () => { },
            getComputedLeft: () => 0,
            getComputedTop: () => 0,
            getComputedWidth: () => 80,
            getComputedHeight: () => 24,
            markDirty: () => { },
            setMeasureFunc: () => { },
        }),
        destroy: () => { },
    },
    DIRECTION_LTR: 0,
};
export function applyStylesToYoga(yogaNode, style) {
    // Simplified - real implementation would use yoga-layout
}
export async function renderPipeline(root, prevFrame, dimensions) {
    const phases = [];
    phases.push({ name: 'react', durationMs: 0 });
    const yogaStart = performance.now();
    root.yogaNode.calculateLayout(dimensions.columns, dimensions.rows, Yoga.DIRECTION_LTR);
    phases.push({ name: 'yoga', durationMs: performance.now() - yogaStart });
    return { phases };
}
//# sourceMappingURL=pipeline.js.map