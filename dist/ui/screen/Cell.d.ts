/**
 * Screen cell packed representation.
 * Word 0: charId (32 bits) - index into CharPool
 * Word 1: styleId[31:17] (15 bits) | hyperlinkId[16:2] (15 bits) | width[1:0] (2 bits)
 */
export type Cell = bigint;
/**
 * Pack cell components into a 64-bit value.
 */
export declare function packCell(charId: number, styleId: number, hyperlinkId: number, width: number): Cell;
/**
 * Unpack cell components.
 */
export declare function unpackCell(cell: Cell): {
    charId: number;
    styleId: number;
    hyperlinkId: number;
    width: number;
};
/**
 * Extract just charId for fast comparisons.
 */
export declare function getCharId(cell: Cell): number;
/**
 * Extract just styleId for diffing.
 */
export declare function getStyleId(cell: Cell): number;
/**
 * Get width from packed cell.
 */
export declare function getWidth(cell: Cell): number;
//# sourceMappingURL=Cell.d.ts.map