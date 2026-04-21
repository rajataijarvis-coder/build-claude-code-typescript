/**
 * Multi-protocol input parser.
 * Supports: Kitty keyboard, xterm modifyOtherKeys, legacy VT sequences, SGR mouse.
 */
/**
 * Parse a tokenized sequence into a structured input event.
 */
export function parseInput(sequence) {
    // Empty sequence
    if (!sequence || sequence.length === 0)
        return null;
    // Check for Kitty keyboard protocol: CSI codepoint ; modifiers u
    const kittyMatch = sequence.match(/^\x1b\[(\d+)(?:;(\d+))?u$/);
    if (kittyMatch) {
        return parseKittySequence(parseInt(kittyMatch[1], 10), kittyMatch[2] ? parseInt(kittyMatch[2], 10) : undefined);
    }
    // Check for xterm modifyOtherKeys: CSI 27 ; modifier ; keycode ~
    const modifyMatch = sequence.match(/^\x1b\[27;(\d+);(\d+)~$/);
    if (modifyMatch) {
        return parseModifyOtherKeys(parseInt(modifyMatch[1], 10), parseInt(modifyMatch[2], 10));
    }
    // Check for SGR mouse: CSI < button ; col ; row M/m
    const mouseMatch = sequence.match(/^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/);
    if (mouseMatch) {
        return parseSGRMouse(parseInt(mouseMatch[1], 10), parseInt(mouseMatch[2], 10), parseInt(mouseMatch[3], 10), mouseMatch[4] === 'M');
    }
    // Check for CSI cursor position response
    const cprMatch = sequence.match(/^\x1b\[(\d+);(\d+)R$/);
    if (cprMatch) {
        return {
            kind: 'response',
            type: 'cursorPosition',
            data: {
                row: parseInt(cprMatch[1], 10),
                col: parseInt(cprMatch[2], 10),
            },
        };
    }
    // Check for function keys and arrows
    const fnMatch = sequence.match(/^\x1b(?:O|\[)([0-9;]*)([A-Za-z])$/);
    if (fnMatch) {
        return parseFunctionKey(fnMatch[1], fnMatch[2]);
    }
    // Single escape (ESC key)
    if (sequence === '\x1b') {
        return {
            kind: 'key',
            name: 'escape',
            ctrl: false,
            meta: false,
            shift: false,
            option: false,
            super: false,
            sequence,
            isPasted: false,
        };
    }
    // ESC + char (Alt/Option + key)
    if (sequence.length === 2 && sequence[0] === '\x1b') {
        const char = sequence[1];
        return {
            kind: 'key',
            name: char.toLowerCase(),
            ctrl: false,
            meta: true, // Alt
            shift: char >= 'A' && char <= 'Z',
            option: true,
            super: false,
            sequence,
            isPasted: false,
        };
    }
    // Control characters
    if (sequence.length === 1) {
        const code = sequence.charCodeAt(0);
        // Ctrl+A through Ctrl+Z
        if (code >= 1 && code <= 26) {
            const letter = String.fromCharCode(code + 64).toLowerCase();
            return {
                kind: 'key',
                name: letter,
                ctrl: true,
                meta: false,
                shift: false,
                option: false,
                super: false,
                sequence,
                isPasted: false,
            };
        }
        // Special control characters
        if (code === 0)
            return createKey('space', { ctrl: true }, sequence);
        if (code === 9)
            return createKey('tab', {}, sequence);
        if (code === 13)
            return createKey('return', {}, sequence);
        if (code === 27)
            return createKey('escape', {}, sequence);
        if (code === 32)
            return createKey('space', {}, sequence);
        if (code === 127)
            return createKey('backspace', {}, sequence);
        // Regular printable character
        return {
            kind: 'key',
            name: sequence,
            ctrl: false,
            meta: false,
            shift: false,
            option: false,
            super: false,
            sequence,
            isPasted: false,
        };
    }
    // Unknown sequence - treat as individual characters
    return null;
}
function parseKittySequence(codepoint, modifiers) {
    const keyName = CODEPOINT_TO_KEY[codepoint] ?? String.fromCharCode(codepoint);
    const mod = (modifiers ?? 1) - 1;
    return {
        kind: 'key',
        name: keyName,
        ctrl: (mod & 4) !== 0,
        meta: (mod & 2) !== 0,
        shift: (mod & 1) !== 0,
        option: (mod & 2) !== 0,
        super: (mod & 8) !== 0,
        sequence: `\x1b[${codepoint}${modifiers ? `;${modifiers}` : ''}u`,
        isPasted: false,
    };
}
function parseModifyOtherKeys(modifier, keycode) {
    const mod = modifier - 1;
    return {
        kind: 'key',
        name: String.fromCharCode(keycode).toLowerCase(),
        ctrl: (mod & 4) !== 0,
        meta: (mod & 2) !== 0,
        shift: (mod & 1) !== 0,
        option: (mod & 2) !== 0,
        super: (mod & 8) !== 0,
        sequence: `\x1b[27;${modifier};${keycode}~`,
        isPasted: false,
    };
}
function parseFunctionKey(params, final) {
    const parts = params.split(';').map(Number);
    const baseCode = parts[0] || 0;
    const modifier = (parts[1] || 1) - 1;
    const keyName = FUNCTION_KEY_MAP[`${baseCode}${final}`];
    if (!keyName)
        return null;
    return {
        kind: 'key',
        name: keyName,
        ctrl: (modifier & 4) !== 0,
        meta: (modifier & 2) !== 0,
        shift: (modifier & 1) !== 0,
        option: (modifier & 2) !== 0,
        super: (modifier & 8) !== 0,
        sequence: `\x1b[${params}${final}`,
        isPasted: false,
    };
}
function parseSGRMouse(button, col, row, isPress) {
    const isWheel = button >= 64;
    const isDrag = button >= 32 && !isWheel;
    const actualButton = button & ~32 & ~64;
    return {
        kind: 'mouse',
        button: actualButton,
        action: isWheel ? 'press' : isDrag ? 'drag' : isPress ? 'press' : 'release',
        col,
        row,
    };
}
function createKey(name, modifiers, sequence) {
    return {
        kind: 'key',
        name,
        ctrl: modifiers.ctrl ?? false,
        meta: modifiers.meta ?? false,
        shift: modifiers.shift ?? false,
        option: modifiers.option ?? false,
        super: modifiers.super ?? false,
        sequence,
        isPasted: false,
    };
}
const CODEPOINT_TO_KEY = {
    1: 'home',
    2: 'insert',
    3: 'delete',
    4: 'end',
    5: 'pageup',
    6: 'pagedown',
    7: 'backspace',
    9: 'tab',
    13: 'return',
    27: 'escape',
    127: 'backspace',
    57348: 'f1',
    57349: 'f2',
    57350: 'f3',
    57351: 'f4',
    57352: 'f5',
    57353: 'f6',
    57354: 'f7',
    57355: 'f8',
    57356: 'f9',
    57357: 'f10',
    57358: 'f11',
    57359: 'f12',
};
const FUNCTION_KEY_MAP = {
    'A': 'up',
    'B': 'down',
    'C': 'right',
    'D': 'left',
    'H': 'home',
    'F': 'end',
    'E': 'clear',
    'P': 'f1',
    'Q': 'f2',
    'R': 'f3',
    'S': 'f4',
    '11~': 'f1',
    '12~': 'f2',
    '13~': 'f3',
    '14~': 'f4',
    '15~': 'f5',
    '17~': 'f6',
    '18~': 'f7',
    '19~': 'f8',
    '20~': 'f9',
    '21~': 'f10',
    '23~': 'f11',
    '24~': 'f12',
    '2~': 'insert',
    '3~': 'delete',
    '5~': 'pageup',
    '6~': 'pagedown',
    '1;5A': 'up',
    '1;5B': 'down',
    '1;5C': 'right',
    '1;5D': 'left',
    '1;2A': 'up',
    '1;2B': 'down',
};
//# sourceMappingURL=parser.js.map