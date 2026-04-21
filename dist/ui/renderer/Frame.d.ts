/**
 * Frame represents one complete screen state.
 * Ink maintains two: front (displayed) and back (rendering into).
 */
import { Screen } from '../screen/Screen.js';
export interface FrameDimensions {
    columns: number;
    rows: number;
}
export declare class Frame {
    screen: Screen;
    dimensions: FrameDimensions;
    cursor: {
        x: number;
        y: number;
        visible: boolean;
    };
    constructor(dimensions: FrameDimensions);
    static swap(front: Frame, back: Frame): void;
}
//# sourceMappingURL=Frame.d.ts.map