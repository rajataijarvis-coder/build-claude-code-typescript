/**
 * Pool for interning styles to integer IDs.
 * Bit 0 encodes visibility on spaces.
 */
export class StylePool {
    styles = [{}];
    index = new Map();
    transitions = new Map();
    /**
     * Intern a style, returning pool ID.
     */
    intern(style) {
        const key = JSON.stringify(style);
        const cached = this.index.get(key);
        if (cached !== undefined)
            return cached;
        const id = this.styles.length;
        this.styles.push(style);
        this.index.set(key, id);
        return id;
    }
    /**
     * Get style by ID.
     */
    get(id) {
        return this.styles[id] ?? {};
    }
    /**
     * Check if style is visible on space characters.
     * Uses bit 0 trick: odd IDs are visible on spaces.
     */
    isVisibleOnSpace(styleId) {
        return (styleId & 1) === 1;
    }
    /**
     * Get cached ANSI transition string between styles.
     */
    getTransition(fromId, toId) {
        const cacheKey = `${fromId}->${toId}`;
        const cached = this.transitions.get(cacheKey);
        if (cached !== undefined)
            return cached;
        const from = this.get(fromId);
        const to = this.get(toId);
        const transition = computeAnsiTransition(from, to);
        this.transitions.set(cacheKey, transition);
        return transition;
    }
}
/**
 * Compute ANSI escape sequence to transition between styles.
 */
function computeAnsiTransition(from, to) {
    const codes = [];
    // Check each property for change
    if (from.bold !== to.bold) {
        codes.push(to.bold ? 1 : 22);
    }
    if (from.dim !== to.dim) {
        codes.push(to.dim ? 2 : 22);
    }
    if (from.italic !== to.italic) {
        codes.push(to.italic ? 3 : 23);
    }
    if (from.underline !== to.underline) {
        codes.push(to.underline ? 4 : 24);
    }
    if (from.inverse !== to.inverse) {
        codes.push(to.inverse ? 7 : 27);
    }
    if (from.strikethrough !== to.strikethrough) {
        codes.push(to.strikethrough ? 9 : 29);
    }
    // Foreground
    if (from.foreground !== to.foreground) {
        if (to.foreground) {
            codes.push(...parseColor(to.foreground, 30));
        }
        else {
            codes.push(39);
        }
    }
    // Background
    if (from.background !== to.background) {
        if (to.background) {
            codes.push(...parseColor(to.background, 40));
        }
        else {
            codes.push(49);
        }
    }
    if (codes.length === 0)
        return '';
    return `\x1b[${codes.join(';')}m`;
}
/**
 * Parse color to ANSI codes.
 */
function parseColor(color, base) {
    // Handle hex colors
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return [base + 8, 2, r, g, b]; // 38;2;R;G;B or 48;2;R;G;B
    }
    // Named colors (simplified)
    const named = {
        black: 0, red: 1, green: 2, yellow: 3,
        blue: 4, magenta: 5, cyan: 6, white: 7,
        gray: 8, brightRed: 9, brightGreen: 10,
        brightYellow: 11, brightBlue: 12,
        brightMagenta: 13, brightCyan: 14, brightWhite: 15,
    };
    const code = named[color];
    if (code !== undefined) {
        return code < 8 ? [base + code] : [base + 8, 5, code];
    }
    return [base + 9]; // Reset to default
}
//# sourceMappingURL=StylePool.js.map