/**
 * Keybinding resolution with chord support.
 */
import { ParsedKey } from '../types.js';
import { KeybindingContext, KeybindingBlock, ResolutionResult } from './types.js';
export interface ResolverState {
    pendingChord: string[];
    chordTimeout: ReturnType<typeof setTimeout> | null;
}
export declare function createResolverState(): ResolverState;
export declare function normalizeKey(key: ParsedKey): string;
export declare function resolveKeybinding(key: ParsedKey, activeContexts: KeybindingContext[], bindings: KeybindingBlock[], state: ResolverState, scheduleTimeout: (ms: number, callback: () => void) => ReturnType<typeof setTimeout>, clearTimeoutFn: (timer: ReturnType<typeof setTimeout>) => void): ResolutionResult;
//# sourceMappingURL=resolver.d.ts.map