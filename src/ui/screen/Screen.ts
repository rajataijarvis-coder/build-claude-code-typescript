/**
 * Screen buffer with packed cells.
 */

import { Cell, packCell } from './Cell.js';
import { CharPool } from '../pools/CharPool.js';
import { StylePool, StyleDefinition } from '../pools/StylePool.js';
import { HyperlinkPool } from '../pools/HyperlinkPool.js';

export interface ScreenDimensions {
  columns: number;
  rows: number;
}

export class Screen {
  cells: BigInt64Array;

  damage: {
    top: number;
    left: number;
    bottom: number;
    right: number;
    hasDamage: boolean;
  };

  softWrap: Int32Array;

  constructor(
    public dimensions: ScreenDimensions,
    public charPool: CharPool,
    public stylePool: StylePool,
    public hyperlinkPool: HyperlinkPool
  ) {
    const cellCount = dimensions.columns * dimensions.rows;
    this.cells = new BigInt64Array(cellCount).fill(0n);

    this.damage = {
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      hasDamage: false,
    };

    this.softWrap = new Int32Array(dimensions.rows).fill(-1);
  }

  getIndex(row: number, col: number): number {
    return row * this.dimensions.columns + col;
  }

  getCell(row: number, col: number): Cell {
    return this.cells[this.getIndex(row, col)];
  }

  setCell(row: number, col: number, cell: Cell): void {
    const index = this.getIndex(row, col);
    this.cells[index] = cell;
    this.markDamage(row, col);
  }

  writeChar(
    row: number,
    col: number,
    char: string,
    style: StyleDefinition = {}
  ): void {
    const charId = this.charPool.intern(char);
    const styleId = this.stylePool.intern(style);
    const hyperlinkId = 0;
    const width = char.length > 1 ? 2 : 1;

    const cell = packCell(charId, styleId, hyperlinkId, width);
    this.setCell(row, col, cell);
  }

  markDamage(row: number, col: number): void {
    if (!this.damage.hasDamage) {
      this.damage.top = row;
      this.damage.left = col;
      this.damage.bottom = row;
      this.damage.right = col;
      this.damage.hasDamage = true;
    } else {
      this.damage.top = Math.min(this.damage.top, row);
      this.damage.left = Math.min(this.damage.left, col);
      this.damage.bottom = Math.max(this.damage.bottom, row);
      this.damage.right = Math.max(this.damage.right, col);
    }
  }

  clearDamage(): void {
    this.damage.hasDamage = false;
  }

  clear(): void {
    this.cells.fill(0n);
    this.markDamage(0, 0);
  }

  createSibling(): Screen {
    return new Screen(
      this.dimensions,
      this.charPool,
      this.stylePool,
      this.hyperlinkPool
    );
  }
}
