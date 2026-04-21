/**
 * Terminal mode escape sequences.
 * Raw mode, bracketed paste, focus events, mouse support, Kitty keyboard protocol.
 */
export declare const ENABLE_KITTY_KEYBOARD = "\u001B[>1u";
export declare const DISABLE_KITTY_KEYBOARD = "\u001B[<1u";
export declare const QUERY_KITTY_KEYBOARD = "\u001B[?u";
export declare const ENABLE_MODIFY_OTHER_KEYS = "\u001B[>4;2m";
export declare const DISABLE_MODIFY_OTHER_KEYS = "\u001B[>4;0m";
export declare const ENABLE_BRACKETED_PASTE = "\u001B[?2004h";
export declare const DISABLE_BRACKETED_PASTE = "\u001B[?2004l";
export declare const ENABLE_FOCUS_EVENTS = "\u001B[?1004h";
export declare const DISABLE_FOCUS_EVENTS = "\u001B[?1004l";
export declare const ENABLE_SGR_MOUSE = "\u001B[?1002h\u001B[?1006h";
export declare const DISABLE_SGR_MOUSE = "\u001B[?1006l\u001B[?1002l";
export declare const ENABLE_ALT_SCREEN = "\u001B[?1049h";
export declare const DISABLE_ALT_SCREEN = "\u001B[?1049l";
export declare const HIDE_CURSOR = "\u001B[?25l";
export declare const SHOW_CURSOR = "\u001B[?25h";
/**
 * Get initialization sequence for full terminal mode.
 */
export declare function getTerminalInitSequence(): string;
/**
 * Get cleanup sequence to restore terminal state.
 */
export declare function getTerminalCleanupSequence(): string;
//# sourceMappingURL=terminalMode.d.ts.map