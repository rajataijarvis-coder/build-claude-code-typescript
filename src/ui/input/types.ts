/**
 * Input types for terminal keyboard/mouse handling.
 * Supports multiple protocols: Kitty keyboard, xterm modifyOtherKeys, legacy VT sequences.
 */

/**
 * Parsed keypress with normalized modifiers.
 */
export interface ParsedKey {
  kind: 'key';
  name: string;             // 'return', 'escape', 'a', 'f1', etc.
  ctrl: boolean;
  meta: boolean;            // Alt/Option
  shift: boolean;
  option: boolean;          // macOS Option
  super: boolean;           // Cmd (when supported)
  sequence: string;         // Raw sequence for debugging
  isPasted: boolean;        // From bracketed paste
}

/**
 * Parsed mouse event.
 */
export interface ParsedMouse {
  kind: 'mouse';
  button: number;           // 0=left, 1=middle, 2=right
  action: 'press' | 'release' | 'drag';
  col: number;              // 1-indexed terminal column
  row: number;              // 1-indexed terminal row
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
