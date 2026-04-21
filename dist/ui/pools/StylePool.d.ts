/**
 * Pool for interning styles to integer IDs.
 * Bit 0 encodes visibility on spaces.
 */
export interface StyleDefinition {
    foreground?: string;
    background?: string;
    bold?: boolean;
    dim?: boolean;
    italic?: boolean;
    underline?: boolean;
    inverse?: boolean;
    strikethrough?: boolean;
}
export declare class StylePool {
    private styles;
    private index;
    private transitions;
    /**
     * Intern a style, returning pool ID.
     */
    intern(style: StyleDefinition): number;
    /**
     * Get style by ID.
     */
    get(id: number): StyleDefinition;
    /**
     * Check if style is visible on space characters.
     * Uses bit 0 trick: odd IDs are visible on spaces.
     */
    isVisibleOnSpace(styleId: number): boolean;
    /**
     * Get cached ANSI transition string between styles.
     */
    getTransition(fromId: number, toId: number): string;
}
//# sourceMappingURL=StylePool.d.ts.map