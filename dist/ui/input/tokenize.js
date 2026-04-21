/**
 * Terminal input tokenizer.
 * Handles escape sequence boundaries with timeout-based reassembly.
 */
const INITIAL_TIMEOUT_MS = 50; // Escape sequence timeout
const PASTE_TIMEOUT_MS = 500; // Paste operation timeout
/**
 * Create a fresh tokenizer state.
 */
export function createTokenizerState() {
    return {
        buffer: '',
        timeout: null,
        isPasting: false,
    };
}
/**
 * Process input chunk, returning completed tokens.
 * Handles incomplete sequences with timeout-based reassembly.
 */
export function tokenize(state, chunk, onToken, scheduleFlush, clearFlush) {
    // Append new bytes to buffer
    state.buffer += chunk.toString('utf8');
    // Check for bracketed paste markers
    while (state.buffer.length > 0) {
        if (state.isPasting) {
            const endIdx = state.buffer.indexOf('\x1b[201~');
            if (endIdx !== -1) {
                // End of paste
                const content = state.buffer.slice(0, endIdx);
                state.buffer = state.buffer.slice(endIdx + 6); // Remove marker
                state.isPasting = false;
                // Emit each character as pasted token
                for (const char of content) {
                    onToken({ sequence: char, isPasted: true });
                }
            }
            else {
                // Still accumulating paste
                break;
            }
        }
        else {
            const startIdx = state.buffer.indexOf('\x1b[200~');
            if (startIdx !== -1) {
                // Start of paste - emit everything before as normal
                const before = state.buffer.slice(0, startIdx);
                state.buffer = state.buffer.slice(startIdx + 6); // Remove marker
                state.isPasting = true;
                // Emit normal tokens before paste
                emitNormalTokens(before, onToken);
            }
            else {
                // Normal input processing
                const consumed = emitNormalTokens(state.buffer, onToken);
                state.buffer = state.buffer.slice(consumed);
                break;
            }
        }
    }
    // Schedule flush for incomplete sequences
    if (state.buffer.length > 0) {
        if (state.timeout) {
            clearFlush(state.timeout);
        }
        const timeoutMs = state.isPasting ? PASTE_TIMEOUT_MS : INITIAL_TIMEOUT_MS;
        state.timeout = scheduleFlush(timeoutMs, () => {
            // Timeout expired - flush as individual keys
            for (const char of state.buffer) {
                onToken({ sequence: char, isPasted: false });
            }
            state.buffer = '';
            state.timeout = null;
        });
    }
}
/**
 * Emit complete escape sequences as tokens.
 * Returns the number of characters consumed.
 */
function emitNormalTokens(buffer, onToken) {
    let pos = 0;
    while (pos < buffer.length) {
        const remaining = buffer.slice(pos);
        // Check for escape sequence
        if (remaining[0] === '\x1b') {
            const seqLen = matchEscapeSequence(remaining);
            if (seqLen > 0 && pos + seqLen <= buffer.length) {
                onToken({
                    sequence: buffer.slice(pos, pos + seqLen),
                    isPasted: false,
                });
                pos += seqLen;
                continue;
            }
            // Incomplete sequence - stop here
            break;
        }
        // Regular character
        onToken({ sequence: remaining[0], isPasted: false });
        pos++;
    }
    return pos;
}
/**
 * Try to match an escape sequence at the start of the string.
 * Returns sequence length if matched, 0 if incomplete, -1 if not a sequence.
 */
function matchEscapeSequence(str) {
    // OSC sequences: ESC ] ... BEL or ESC ] ... ESC \
    const oscMatch = str.match(/^\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/);
    if (oscMatch)
        return oscMatch[0].length;
    // CSI sequences: ESC [ ... final byte
    const csiMatch = str.match(/^\x1b\[[0-9;:<=>?]*[A-Za-z`{|}]/);
    if (csiMatch)
        return csiMatch[0].length;
    // SS3 sequences: ESC O ...
    const ss3Match = str.match(/^\x1bO[A-Za-z0-9]/);
    if (ss3Match)
        return ss3Match[0].length;
    // DCS sequences: ESC P ... ST
    const dcsMatch = str.match(/^\x1bP[^\x1b]*\x1b\\/);
    if (dcsMatch)
        return dcsMatch[0].length;
    // Single ESC is incomplete unless followed by non-[ character
    if (str.length === 1)
        return 0; // Incomplete
    if (str[1] !== '[' && str[1] !== 'O' && str[1] !== 'P' && str[1] !== ']') {
        // ESC followed by regular char - this is Alt+key, not a sequence
        return -1;
    }
    return 0; // Potentially incomplete
}
//# sourceMappingURL=tokenize.js.map