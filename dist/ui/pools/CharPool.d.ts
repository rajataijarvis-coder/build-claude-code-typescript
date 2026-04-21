/**
 * Pool for interning character strings to integer IDs.
 * Shared across frames so blit can copy cell words directly.
 */
export declare class CharPool {
    private strings;
    private ascii;
    private multiByte;
    constructor();
    /**
     * Intern a character string, returning pool ID.
     */
    intern(char: string): number;
    /**
     * Get string by ID.
     */
    get(id: number): string;
    /**
     * Reset pool (called periodically to bound growth).
     */
    reset(liveIds: Set<number>): CharPool;
}
//# sourceMappingURL=CharPool.d.ts.map