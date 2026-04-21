/**
 * Pool for interning hyperlink URIs (OSC 8).
 */
export declare class HyperlinkPool {
    private uris;
    private index;
    /**
     * Intern a URI, returning pool ID.
     */
    intern(uri: string): number;
    /**
     * Get URI by ID.
     */
    get(id: number): string;
    /**
     * Generate OSC 8 hyperlink escape sequence.
     */
    getOsc8(id: number, params?: string): string;
    /**
     * Close OSC 8 hyperlink.
     */
    getOsc8Close(): string;
}
//# sourceMappingURL=HyperlinkPool.d.ts.map