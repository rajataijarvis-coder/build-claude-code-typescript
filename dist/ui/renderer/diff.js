/**
 * Cell-level diffing between screens.
 */
import { unpackCell } from '../screen/Cell.js';
export function diffScreens(prev, current) {
    const patches = [];
    if (!prev) {
        return createFullScreenPatches(current);
    }
    if (!current.damage.hasDamage) {
        return patches;
    }
    const { top, left, bottom, right } = current.damage;
    for (let row = top; row <= bottom; row++) {
        let rowStart = -1;
        for (let col = left; col <= right; col++) {
            const prevCell = prev.getCell(row, col);
            const currCell = current.getCell(row, col);
            const different = cellsDiffer(prevCell, currCell);
            if (different && rowStart === -1) {
                rowStart = col;
            }
            else if (!different && rowStart !== -1) {
                const patch = createRowPatch(current, row, rowStart, col - 1);
                patches.push(patch);
                rowStart = -1;
            }
        }
        if (rowStart !== -1) {
            const patch = createRowPatch(current, row, rowStart, right);
            patches.push(patch);
        }
    }
    return patches;
}
function cellsDiffer(a, b) {
    return a !== b;
}
function createRowPatch(screen, row, startCol, endCol) {
    let content = moveCursor(row, startCol);
    let currentStyle = 0;
    for (let col = startCol; col <= endCol; col++) {
        const cell = screen.getCell(row, col);
        const { charId, styleId, hyperlinkId } = unpackCell(cell);
        if (styleId !== currentStyle) {
            content += screen.stylePool.getTransition(currentStyle, styleId);
            currentStyle = styleId;
        }
        if (hyperlinkId !== 0) {
            content += screen.hyperlinkPool.getOsc8(hyperlinkId);
        }
        const char = screen.charPool.get(charId);
        content += char;
        if (hyperlinkId !== 0) {
            content += screen.hyperlinkPool.getOsc8Close();
        }
    }
    if (currentStyle !== 0) {
        content += '\x1b[0m';
    }
    return {
        type: 'stdout',
        row,
        startCol,
        endCol,
        content,
    };
}
function moveCursor(row, col) {
    return `\x1b[${row + 1};${col + 1}H`;
}
function createFullScreenPatches(screen) {
    const patches = [];
    for (let row = 0; row < screen.dimensions.rows; row++) {
        const patch = createRowPatch(screen, row, 0, screen.dimensions.columns - 1);
        patches.push(patch);
    }
    return patches;
}
//# sourceMappingURL=diff.js.map