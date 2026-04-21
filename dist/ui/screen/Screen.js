/**
 * Screen buffer with packed cells.
 */
import { packCell } from './Cell.js';
export class Screen {
    dimensions;
    charPool;
    stylePool;
    hyperlinkPool;
    cells;
    damage;
    softWrap;
    constructor(dimensions, charPool, stylePool, hyperlinkPool) {
        this.dimensions = dimensions;
        this.charPool = charPool;
        this.stylePool = stylePool;
        this.hyperlinkPool = hyperlinkPool;
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
    getIndex(row, col) {
        return row * this.dimensions.columns + col;
    }
    getCell(row, col) {
        return this.cells[this.getIndex(row, col)];
    }
    setCell(row, col, cell) {
        const index = this.getIndex(row, col);
        this.cells[index] = cell;
        this.markDamage(row, col);
    }
    writeChar(row, col, char, style = {}) {
        const charId = this.charPool.intern(char);
        const styleId = this.stylePool.intern(style);
        const hyperlinkId = 0;
        const width = char.length > 1 ? 2 : 1;
        const cell = packCell(charId, styleId, hyperlinkId, width);
        this.setCell(row, col, cell);
    }
    markDamage(row, col) {
        if (!this.damage.hasDamage) {
            this.damage.top = row;
            this.damage.left = col;
            this.damage.bottom = row;
            this.damage.right = col;
            this.damage.hasDamage = true;
        }
        else {
            this.damage.top = Math.min(this.damage.top, row);
            this.damage.left = Math.min(this.damage.left, col);
            this.damage.bottom = Math.max(this.damage.bottom, row);
            this.damage.right = Math.max(this.damage.right, col);
        }
    }
    clearDamage() {
        this.damage.hasDamage = false;
    }
    clear() {
        this.cells.fill(0n);
        this.markDamage(0, 0);
    }
    createSibling() {
        return new Screen(this.dimensions, this.charPool, this.stylePool, this.hyperlinkPool);
    }
}
//# sourceMappingURL=Screen.js.map