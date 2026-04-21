/**
 * Keybinding resolution with chord support.
 */

import { ParsedKey } from '../types.js';
import { 
  ActionName, 
  KeybindingContext, 
  KeybindingBlock, 
  ResolutionResult 
} from './types.js';

export interface ResolverState {
  pendingChord: string[];
  chordTimeout: ReturnType<typeof setTimeout> | null;
}

const CHORD_TIMEOUT_MS = 1000;

export function createResolverState(): ResolverState {
  return {
    pendingChord: [],
    chordTimeout: null,
  };
}

export function normalizeKey(key: ParsedKey): string {
  const parts: string[] = [];
  
  if (key.ctrl) parts.push('ctrl');
  if (key.shift) parts.push('shift');
  if (key.meta) parts.push('meta');
  if (key.option) parts.push('option');
  if (key.super) parts.push('super');
  
  const name = KEY_NAME_ALIASES[key.name] ?? key.name;
  parts.push(name);
  
  return parts.join('+');
}

export function resolveKeybinding(
  key: ParsedKey,
  activeContexts: KeybindingContext[],
  bindings: KeybindingBlock[],
  state: ResolverState,
  scheduleTimeout: (ms: number, callback: () => void) => ReturnType<typeof setTimeout>,
  clearTimeoutFn: (timer: ReturnType<typeof setTimeout>) => void
): ResolutionResult {
  const normalized = normalizeKey(key);
  
  const contextBindings = buildContextBindings(activeContexts, bindings);
  
  if (state.pendingChord.length > 0) {
    const fullChord = [...state.pendingChord, normalized].join(' ');
    
    if (fullChord in contextBindings) {
      const action = contextBindings[fullChord];
      clearChord(state, clearTimeoutFn);
      return action === null 
        ? { type: 'unbound' }
        : { type: 'match', action };
    }
    
    const chordPrefix = state.pendingChord.join(' ') + ' ';
    const hasContinuation = Object.keys(contextBindings).some(k => 
      k.startsWith(chordPrefix)
    );
    
    if (!hasContinuation) {
      clearChord(state, clearTimeoutFn);
      return { type: 'chord_cancelled' };
    }
    
    state.pendingChord.push(normalized);
    resetChordTimeout(state, scheduleTimeout, clearTimeoutFn);
    return { type: 'chord_started', pending: [...state.pendingChord] };
  }
  
  if (normalized in contextBindings) {
    const action = contextBindings[normalized];
    return action === null
      ? { type: 'unbound' }
      : { type: 'match', action };
  }
  
  const chordPrefix = normalized + ' ';
  const hasContinuation = Object.keys(contextBindings).some(k =>
    k.startsWith(chordPrefix)
  );
  
  if (hasContinuation) {
    state.pendingChord = [normalized];
    resetChordTimeout(state, scheduleTimeout, clearTimeoutFn);
    return { type: 'chord_started', pending: [normalized] };
  }
  
  return { type: 'none' };
}

function buildContextBindings(
  contexts: KeybindingContext[],
  blocks: KeybindingBlock[]
): Record<string, ActionName | null> {
  const merged: Record<string, ActionName | null> = {};
  
  const globalBlock = blocks.find(b => b.context === 'Global');
  if (globalBlock) {
    Object.assign(merged, globalBlock.bindings);
  }
  
  for (const context of contexts) {
    const block = blocks.find(b => b.context === context);
    if (block) {
      Object.assign(merged, block.bindings);
    }
  }
  
  return merged;
}

function resetChordTimeout(
  state: ResolverState,
  scheduleTimeout: (ms: number, callback: () => void) => ReturnType<typeof setTimeout>,
  clearTimeoutFn: (timer: ReturnType<typeof setTimeout>) => void
): void {
  if (state.chordTimeout) {
    clearTimeoutFn(state.chordTimeout);
  }
  
  state.chordTimeout = scheduleTimeout(CHORD_TIMEOUT_MS, () => {
    state.pendingChord = [];
    state.chordTimeout = null;
  });
}

function clearChord(
  state: ResolverState,
  clearTimeoutFn: (timer: ReturnType<typeof setTimeout>) => void
): void {
  if (state.chordTimeout) {
    clearTimeoutFn(state.chordTimeout);
    state.chordTimeout = null;
  }
  state.pendingChord = [];
}

const KEY_NAME_ALIASES: Record<string, string> = {
  'return': 'enter',
  'esc': 'escape',
  'del': 'delete',
  'ins': 'insert',
  'pgup': 'pageup',
  'pgdown': 'pagedown',
};
