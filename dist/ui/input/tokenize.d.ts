/**
 * Terminal input tokenizer.
 * Handles escape sequence boundaries with timeout-based reassembly.
 */
import { Token } from './types.js';
export interface TokenizerState {
    buffer: string;
    timeout: ReturnType<typeof setTimeout> | null;
    isPasting: boolean;
}
/**
 * Create a fresh tokenizer state.
 */
export declare function createTokenizerState(): TokenizerState;
/**
 * Process input chunk, returning completed tokens.
 * Handles incomplete sequences with timeout-based reassembly.
 */
export declare function tokenize(state: TokenizerState, chunk: Buffer, onToken: (token: Token) => void, scheduleFlush: (ms: number, callback: () => void) => ReturnType<typeof setTimeout>, clearFlush: (timer: ReturnType<typeof setTimeout>) => void): void;
//# sourceMappingURL=tokenize.d.ts.map