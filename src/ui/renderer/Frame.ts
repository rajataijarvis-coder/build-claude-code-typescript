/**
 * Frame represents one complete screen state.
 * Ink maintains two: front (displayed) and back (rendering into).
 */

import { Screen } from '../screen/Screen.js';
import { CharPool } from '../pools/CharPool.js';
import { StylePool } from '../pools/StylePool.js';
import { HyperlinkPool } from '../pools/HyperlinkPool.js';

export interface FrameDimensions {
  columns: number;
  rows: number;
}

export class Frame {
  screen: Screen;
  dimensions: FrameDimensions;
  cursor: { x: number; y: number; visible: boolean };

  constructor(dimensions: FrameDimensions) {
    this.dimensions = dimensions;

    const charPool = new CharPool();
    const stylePool = new StylePool();
    const hyperlinkPool = new HyperlinkPool();

    this.screen = new Screen(dimensions, charPool, stylePool, hyperlinkPool);
    this.cursor = { x: 0, y: 0, visible: false };
  }

  static swap(front: Frame, back: Frame): void {
    const tempCells = front.screen.cells;
    front.screen.cells = back.screen.cells;
    back.screen.cells = tempCells;

    back.screen.cells.fill(0n);
    back.screen.clearDamage();
  }
}
