/**
 * Frame represents one complete screen state.
 * Ink maintains two: front (displayed) and back (rendering into).
 */
import { Screen } from '../screen/Screen.js';
import { CharPool } from '../pools/CharPool.js';
import { StylePool } from '../pools/StylePool.js';
import { HyperlinkPool } from '../pools/HyperlinkPool.js';
export class Frame {
    screen;
    dimensions;
    cursor;
    constructor(dimensions) {
        this.dimensions = dimensions;
        const charPool = new CharPool();
        const stylePool = new StylePool();
        const hyperlinkPool = new HyperlinkPool();
        this.screen = new Screen(dimensions, charPool, stylePool, hyperlinkPool);
        this.cursor = { x: 0, y: 0, visible: false };
    }
    static swap(front, back) {
        const tempCells = front.screen.cells;
        front.screen.cells = back.screen.cells;
        back.screen.cells = tempCells;
        back.screen.cells.fill(0n);
        back.screen.clearDamage();
    }
}
//# sourceMappingURL=Frame.js.map