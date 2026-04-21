/**
 * Unicode width utilities for terminal rendering.
 */
/**
 * Cell width classification for terminal rendering.
 */
export declare enum CellWidth {
    NARROW = 0,// Standard single-column character
    WIDE = 1,// CJK/emoji head cell (occupies 2 columns)
    SPACER_TAIL = 2,// Second column of a wide character
    SPACER_HEAD = 3
}
/**
 * Get display width of a grapheme cluster.
 *
 * - ASCII: 1 column
 * - CJK/East Asian Wide: 2 columns
 * - Emoji: 2 columns
 * - Combining marks: 0 columns
 */
export declare function getGraphemeWidth(grapheme: string): number;
/**
 * Get cell width classification for a character.
 */
export declare function getCellWidth(char: string): CellWidth;
//# sourceMappingURL=unicode.d.ts.map