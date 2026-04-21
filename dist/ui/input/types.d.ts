/**
 * Input types for terminal keyboard/mouse handling.
 * Supports multiple protocols: Kitty keyboard, xterm modifyOtherKeys, legacy VT sequences.
 */
/**
 * Parsed keypress with normalized modifiers.
 */
export interface ParsedKey {
    kind: 'key';
    name: string;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
    option: boolean;
    super: boolean;
    sequence: string;
    isPasted: boolean;
}
/**
 * Parsed mouse event.
 */
export interface ParsedMouse {
    kind: 'mouse';
    button: number;
    action: 'press' | 'release' | 'drag';
    col: number;
    row: number;
}
/**
 * Terminal response to a query.
 */
export interface ParsedResponse {
    kind: 'response';
    type: string;
    data: unknown;
}
export type ParsedInput = ParsedKey | ParsedMouse | ParsedResponse;
/**
 * Token from the tokenizer.
 */
export interface Token {
    sequence: string;
    isPasted: boolean;
}
//# sourceMappingURL=types.d.ts.map