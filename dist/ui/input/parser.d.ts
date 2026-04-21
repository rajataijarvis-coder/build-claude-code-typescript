/**
 * Multi-protocol input parser.
 * Supports: Kitty keyboard, xterm modifyOtherKeys, legacy VT sequences, SGR mouse.
 */
import { ParsedInput } from './types.js';
/**
 * Parse a tokenized sequence into a structured input event.
 */
export declare function parseInput(sequence: string): ParsedInput | null;
//# sourceMappingURL=parser.d.ts.map