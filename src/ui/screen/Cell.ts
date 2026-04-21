/**
 * Screen cell packed representation.
 * Word 0: charId (32 bits) - index into CharPool
 * Word 1: styleId[31:17] (15 bits) | hyperlinkId[16:2] (15 bits) | width[1:0] (2 bits)
 */

export type Cell = bigint;

/**
 * Pack cell components into a 64-bit value.
 */
export function packCell(
  charId: number,
  styleId: number,
  hyperlinkId: number,
  width: number
): Cell {
  return (
    BigInt.asUintN(32, BigInt(charId)) |
    (BigInt.asUintN(64, BigInt(styleId)) << 32n) |
    (BigInt.asUintN(64, BigInt(hyperlinkId)) << 47n) |
    (BigInt.asUintN(64, BigInt(width)) << 62n)
  );
}

/**
 * Unpack cell components.
 */
export function unpackCell(cell: Cell): {
  charId: number;
  styleId: number;
  hyperlinkId: number;
  width: number;
} {
  return {
    charId: Number(cell & 0xffffffffn),
    styleId: Number((cell >> 32n) & 0x7fffn),
    hyperlinkId: Number((cell >> 47n) & 0x7fffn),
    width: Number((cell >> 62n) & 0x3n),
  };
}

/**
 * Extract just charId for fast comparisons.
 */
export function getCharId(cell: Cell): number {
  return Number(cell & 0xffffffffn);
}

/**
 * Extract just styleId for diffing.
 */
export function getStyleId(cell: Cell): number {
  return Number((cell >> 32n) & 0x7fffn);
}

/**
 * Get width from packed cell.
 */
export function getWidth(cell: Cell): number {
  return Number((cell >> 62n) & 0x3n);
}
