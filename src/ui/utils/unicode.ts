/**
 * Unicode width utilities for terminal rendering.
 */

/**
 * Cell width classification for terminal rendering.
 */
export enum CellWidth {
  NARROW = 0,      // Standard single-column character
  WIDE = 1,        // CJK/emoji head cell (occupies 2 columns)
  SPACER_TAIL = 2, // Second column of a wide character
  SPACER_HEAD = 3, // Soft-wrap continuation marker
}

/**
 * Get display width of a grapheme cluster.
 * 
 * - ASCII: 1 column
 * - CJK/East Asian Wide: 2 columns
 * - Emoji: 2 columns
 * - Combining marks: 0 columns
 */
export function getGraphemeWidth(grapheme: string): number {
  // Fast path: ASCII
  if (grapheme.length === 1) {
    const code = grapheme.charCodeAt(0);
    if (code >= 0x20 && code < 0x7f) {
      return 1;
    }
  }

  // Check East Asian Width
  if (isEastAsianWide(grapheme)) {
    return 2;
  }

  // Check emoji
  if (isEmoji(grapheme)) {
    return 2;
  }

  // Check combining marks
  if (isCombiningMark(grapheme)) {
    return 0;
  }

  // Default: 1
  return 1;
}

/**
 * Check if character is East Asian Wide.
 */
function isEastAsianWide(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
    (code >= 0x20000 && code <= 0x2a6df) || // CJK Extension B
    (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility
    (code >= 0x3000 && code <= 0x303f) || // CJK Symbols/Punctuation
    (code >= 0xff00 && code <= 0xffef) || // Fullwidth forms
    (code >= 0xac00 && code <= 0xd7af) // Hangul Syllables
  );
}

/**
 * Check if grapheme is emoji.
 */
function isEmoji(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;

  // Emoji ranges
  return (
    (code >= 0x1f600 && code <= 0x1f64f) || // Emoticons
    (code >= 0x1f300 && code <= 0x1f5ff) || // Misc Symbols
    (code >= 0x1f680 && code <= 0x1f6ff) || // Transport/Map
    (code >= 0x1f900 && code <= 0x1f9ff) || // Supplemental
    (code >= 0x2600 && code <= 0x26ff) || // Misc
    (code >= 0x2700 && code <= 0x27bf) // Dingbats
  );
}

/**
 * Check if grapheme is combining mark.
 */
function isCombiningMark(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return (
    (code >= 0x0300 && code <= 0x036f) || // Combining Diacriticals
    (code >= 0x1ab0 && code <= 0x1aff) || // Extended
    (code >= 0x1dc0 && code <= 0x1dff) || // Supplement
    (code >= 0xfe20 && code <= 0xfe2f) // Half Marks
  );
}

/**
 * Get cell width classification for a character.
 */
export function getCellWidth(char: string): CellWidth {
  const width = getGraphemeWidth(char);
  return width === 2 ? CellWidth.WIDE : CellWidth.NARROW;
}
