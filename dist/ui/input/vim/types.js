/**
 * Vim state machine types.
 */
export function createVimState() {
    return {
        mode: 'NORMAL',
        command: { type: 'idle' },
        cursor: { line: 0, col: 0 },
    };
}
//# sourceMappingURL=types.js.map