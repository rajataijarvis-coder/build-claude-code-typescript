/**
 * Pool for interning hyperlink URIs (OSC 8).
 */
export class HyperlinkPool {
    uris = ['']; // Index 0 = no hyperlink
    index = new Map([['', 0]]);
    /**
     * Intern a URI, returning pool ID.
     */
    intern(uri) {
        const cached = this.index.get(uri);
        if (cached !== undefined)
            return cached;
        const id = this.uris.length;
        this.uris.push(uri);
        this.index.set(uri, id);
        return id;
    }
    /**
     * Get URI by ID.
     */
    get(id) {
        return this.uris[id] ?? '';
    }
    /**
     * Generate OSC 8 hyperlink escape sequence.
     */
    getOsc8(id, params = '') {
        const uri = this.get(id);
        if (!uri)
            return '';
        return `\x1b]8;${params};${uri}\x1b\\`;
    }
    /**
     * Close OSC 8 hyperlink.
     */
    getOsc8Close() {
        return '\x1b]8;;\x1b\\';
    }
}
//# sourceMappingURL=HyperlinkPool.js.map