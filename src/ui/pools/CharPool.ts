/**
 * Pool for interning character strings to integer IDs.
 * Shared across frames so blit can copy cell words directly.
 */

export class CharPool {
  private strings: string[] = [' ', ''];  // Index 0 = space, 1 = empty
  private ascii: Int32Array;
  private multiByte: Map<string, number> = new Map();

  constructor() {
    // Pre-populate ASCII fast path
    this.ascii = new Int32Array(128).fill(-1);
    this.ascii[0x20] = 0; // Space
    this.ascii[0] = 1;    // Empty string
  }

  /**
   * Intern a character string, returning pool ID.
   */
  intern(char: string): number {
    // Fast path: ASCII single-byte
    if (char.length === 1) {
      const code = char.charCodeAt(0);
      if (code < 128) {
        const cached = this.ascii[code];
        if (cached !== -1) return cached;

        const index = this.strings.length;
        this.strings.push(char);
        this.ascii[code] = index;
        return index;
      }
    }

    // Fallback: Map lookup for multi-byte
    const cached = this.multiByte.get(char);
    if (cached !== undefined) return cached;

    const index = this.strings.length;
    this.strings.push(char);
    this.multiByte.set(char, index);
    return index;
  }

  /**
   * Get string by ID.
   */
  get(id: number): string {
    return this.strings[id] ?? ' ';
  }

  /**
   * Reset pool (called periodically to bound growth).
   */
  reset(liveIds: Set<number>): CharPool {
    const fresh = new CharPool();

    // Re-intern live cells into fresh pool
    for (const id of liveIds) {
      const str = this.get(id);
      fresh.intern(str);
    }

    return fresh;
  }
}
