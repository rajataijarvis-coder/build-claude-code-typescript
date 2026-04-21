/**
 * Keybinding resolution with chord support.
 */
const CHORD_TIMEOUT_MS = 1000;
export function createResolverState() {
    return {
        pendingChord: [],
        chordTimeout: null,
    };
}
export function normalizeKey(key) {
    const parts = [];
    if (key.ctrl)
        parts.push('ctrl');
    if (key.shift)
        parts.push('shift');
    if (key.meta)
        parts.push('meta');
    if (key.option)
        parts.push('option');
    if (key.super)
        parts.push('super');
    const name = KEY_NAME_ALIASES[key.name] ?? key.name;
    parts.push(name);
    return parts.join('+');
}
export function resolveKeybinding(key, activeContexts, bindings, state, scheduleTimeout, clearTimeoutFn) {
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
        const hasContinuation = Object.keys(contextBindings).some(k => k.startsWith(chordPrefix));
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
    const hasContinuation = Object.keys(contextBindings).some(k => k.startsWith(chordPrefix));
    if (hasContinuation) {
        state.pendingChord = [normalized];
        resetChordTimeout(state, scheduleTimeout, clearTimeoutFn);
        return { type: 'chord_started', pending: [normalized] };
    }
    return { type: 'none' };
}
function buildContextBindings(contexts, blocks) {
    const merged = {};
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
function resetChordTimeout(state, scheduleTimeout, clearTimeoutFn) {
    if (state.chordTimeout) {
        clearTimeoutFn(state.chordTimeout);
    }
    state.chordTimeout = scheduleTimeout(CHORD_TIMEOUT_MS, () => {
        state.pendingChord = [];
        state.chordTimeout = null;
    });
}
function clearChord(state, clearTimeoutFn) {
    if (state.chordTimeout) {
        clearTimeoutFn(state.chordTimeout);
        state.chordTimeout = null;
    }
    state.pendingChord = [];
}
const KEY_NAME_ALIASES = {
    'return': 'enter',
    'esc': 'escape',
    'del': 'delete',
    'ins': 'insert',
    'pgup': 'pageup',
    'pgdown': 'pagedown',
};
//# sourceMappingURL=resolver.js.map