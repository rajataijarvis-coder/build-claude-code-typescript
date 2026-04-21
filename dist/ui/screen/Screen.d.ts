/**
 * Screen buffer with packed cells.
 */
import { Cell } from './Cell.js';
import { CharPool } from '../pools/CharPool.js';
import { StylePool, StyleDefinition } from '../pools/StylePool.js';
import { HyperlinkPool } from '../pools/HyperlinkPool.js';
export interface ScreenDimensions {
    columns: number;
    rows: number;
}
export declare class Screen {
    dimensions: ScreenDimensions;
    charPool: CharPool;
    stylePool: StylePool;
    hyperlinkPool: HyperlinkPool;
    cells: BigInt64Array;
    damage: {
        top: number;
        left: number;
        bottom: number;
        right: number;
        hasDamage: boolean;
    };
    softWrap: Int32Array;
    constructor(dimensions: ScreenDimensions, charPool: CharPool, stylePool: StylePool, hyperlinkPool: HyperlinkPool);
    getIndex(row: number, col: number): number;
    getCell(row: number, col: number): Cell;
    setCell(row: number, col: number, cell: Cell): void;
    writeChar(row: number, col: number, char: string, style?: StyleDefinition): void;
    markDamage(row: number, col: number): void;
    clearDamage(): void;
    clear(): void;
    createSibling(): Screen;
}
//# sourceMappingURL=Screen.d.ts.map