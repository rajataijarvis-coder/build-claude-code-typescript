/**
 * Terminal mode escape sequences.
 * Raw mode, bracketed paste, focus events, mouse support, Kitty keyboard protocol.
 */
// Kitty keyboard protocol
export const ENABLE_KITTY_KEYBOARD = '\x1b[>1u';
export const DISABLE_KITTY_KEYBOARD = '\x1b[<1u';
export const QUERY_KITTY_KEYBOARD = '\x1b[?u';
// XTerm modifyOtherKeys
export const ENABLE_MODIFY_OTHER_KEYS = '\x1b[>4;2m';
export const DISABLE_MODIFY_OTHER_KEYS = '\x1b[>4;0m';
// Bracketed paste
export const ENABLE_BRACKETED_PASTE = '\x1b[?2004h';
export const DISABLE_BRACKETED_PASTE = '\x1b[?2004l';
// Focus events
export const ENABLE_FOCUS_EVENTS = '\x1b[?1004h';
export const DISABLE_FOCUS_EVENTS = '\x1b[?1004l';
// SGR mouse protocol
export const ENABLE_SGR_MOUSE = '\x1b[?1002h\x1b[?1006h';
export const DISABLE_SGR_MOUSE = '\x1b[?1006l\x1b[?1002l';
// Alternate screen buffer
export const ENABLE_ALT_SCREEN = '\x1b[?1049h';
export const DISABLE_ALT_SCREEN = '\x1b[?1049l';
// Cursor visibility
export const HIDE_CURSOR = '\x1b[?25l';
export const SHOW_CURSOR = '\x1b[?25h';
/**
 * Get initialization sequence for full terminal mode.
 */
export function getTerminalInitSequence() {
    return (ENABLE_ALT_SCREEN +
        HIDE_CURSOR +
        ENABLE_BRACKETED_PASTE +
        ENABLE_FOCUS_EVENTS +
        ENABLE_SGR_MOUSE +
        ENABLE_KITTY_KEYBOARD +
        ENABLE_MODIFY_OTHER_KEYS);
}
/**
 * Get cleanup sequence to restore terminal state.
 */
export function getTerminalCleanupSequence() {
    return (DISABLE_MODIFY_OTHER_KEYS +
        DISABLE_KITTY_KEYBOARD +
        DISABLE_SGR_MOUSE +
        DISABLE_FOCUS_EVENTS +
        DISABLE_BRACKETED_PASTE +
        SHOW_CURSOR +
        DISABLE_ALT_SCREEN);
}
//# sourceMappingURL=terminalMode.js.map