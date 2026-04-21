/**
 * Vim state machine transitions.
 * Pure function from (state, key) => (newState, effect).
 */
import { ParsedKey } from '../types.js';
import { VimState, TransitionResult } from './types.js';
export declare function transition(state: VimState, key: ParsedKey): TransitionResult;
//# sourceMappingURL=transitions.d.ts.map