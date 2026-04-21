/**
 * Vim state machine transitions.
 * Pure function from (state, key) => (newState, effect).
 */
export function transition(state, key) {
    if (state.mode === 'INSERT') {
        return handleInsertMode(state, key);
    }
    if (state.mode === 'NORMAL') {
        return handleNormalMode(state, key);
    }
    if (state.mode === 'COMMAND') {
        return handleCommandMode(state, key);
    }
    return { newState: state, effect: { type: 'none' } };
}
function handleInsertMode(state, key) {
    if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        return {
            newState: { ...state, mode: 'NORMAL', command: { type: 'idle' } },
            effect: { type: 'switchMode', mode: 'NORMAL' },
        };
    }
    return { newState: state, effect: { type: 'none' } };
}
function handleCommandMode(state, key) {
    if (key.name === 'escape') {
        return {
            newState: { ...state, mode: 'NORMAL', command: { type: 'idle' } },
            effect: { type: 'switchMode', mode: 'NORMAL' },
        };
    }
    if (key.name === 'enter' || key.name === 'return') {
        return {
            newState: { ...state, mode: 'NORMAL', command: { type: 'idle' } },
            effect: { type: 'switchMode', mode: 'NORMAL' },
        };
    }
    return { newState: state, effect: { type: 'none' } };
}
function handleNormalMode(state, key) {
    const char = key.name;
    const command = state.command;
    if (/^[1-9]$/.test(char) && command.type !== 'operatorCount') {
        return handleCountPrefix(state, char);
    }
    if (char === '0') {
        if (command.type === 'count' || command.type === 'operatorCount') {
            return handleCountDigit(state, '0');
        }
        return handleMotion(state, 'start');
    }
    switch (command.type) {
        case 'idle':
            return fromIdle(state, key);
        case 'count':
            return fromCount(state, key);
        case 'operator':
            return fromOperator(state, key);
        case 'operatorCount':
            return fromOperatorCount(state, key);
        case 'operatorTextObj':
            return fromOperatorTextObj(state, key);
        case 'find':
            return fromFind(state, key);
        case 'g':
            return fromG(state, key);
        case 'replace':
            return fromReplace(state, key);
        case 'indent':
            return fromIndent(state, key);
        default:
            const _exhaustive = command;
            return { newState: state, effect: { type: 'none' } };
    }
}
function fromIdle(state, key) {
    const char = key.name;
    if (/^[1-9]$/.test(char)) {
        return {
            newState: {
                ...state,
                command: { type: 'count', digits: char }
            },
            effect: { type: 'none' },
        };
    }
    if (char === 'd') {
        return enterOperatorState(state, 'delete');
    }
    if (char === 'c') {
        return enterOperatorState(state, 'change');
    }
    if (char === 'y') {
        return enterOperatorState(state, 'yank');
    }
    if (char === 'f' || char === 'F' || char === 't' || char === 'T') {
        return {
            newState: {
                ...state,
                command: { type: 'find', find: { type: char, char: '' }, count: 1 },
            },
            effect: { type: 'none' },
        };
    }
    if (char === 'g') {
        return {
            newState: { ...state, command: { type: 'g', count: 1 } },
            effect: { type: 'none' },
        };
    }
    if (char === 'r') {
        return {
            newState: { ...state, command: { type: 'replace', count: 1 } },
            effect: { type: 'none' },
        };
    }
    if (char === '>' || char === '<') {
        return {
            newState: { ...state, command: { type: 'indent', dir: char, count: 1 } },
            effect: { type: 'none' },
        };
    }
    const motion = SIMPLE_MOTIONS[char];
    if (motion) {
        return handleMotion(state, motion);
    }
    if (char === 'i' || char === 'a' || char === 'o') {
        return {
            newState: { ...state, mode: 'INSERT' },
            effect: { type: 'switchMode', mode: 'INSERT' },
        };
    }
    if (char === ':') {
        return {
            newState: { ...state, mode: 'COMMAND' },
            effect: { type: 'switchMode', mode: 'COMMAND' },
        };
    }
    if (char === 'x') {
        return {
            newState: { ...state, command: { type: 'idle' } },
            effect: {
                type: 'delete',
                range: {
                    start: state.cursor,
                    end: { ...state.cursor, col: state.cursor.col + 1 }
                }
            },
        };
    }
    if (char === 'shift+g') {
        return handleMotion(state, 'end');
    }
    return { newState: state, effect: { type: 'none' } };
}
function fromCount(state, key) {
    const char = key.name;
    const countState = state.command;
    const count = parseInt(countState.digits, 10);
    if (/^[0-9]$/.test(char)) {
        return {
            newState: {
                ...state,
                command: { type: 'count', digits: countState.digits + char },
            },
            effect: { type: 'none' },
        };
    }
    if (char === 'd' || char === 'c' || char === 'y') {
        const op = char === 'd' ? 'delete' : char === 'c' ? 'change' : 'yank';
        return {
            newState: {
                ...state,
                command: { type: 'operator', op, count },
            },
            effect: { type: 'none' },
        };
    }
    const motion = SIMPLE_MOTIONS[char];
    if (motion) {
        return handleCountedMotion(state, motion, count);
    }
    return {
        newState: { ...state, command: { type: 'idle' } },
        effect: { type: 'none' },
    };
}
function fromOperator(state, key) {
    const opState = state.command;
    const { op, count } = opState;
    const char = key.name;
    if ((char === 'd' && op === 'delete') ||
        (char === 'c' && op === 'change') ||
        (char === 'y' && op === 'yank')) {
        return {
            newState: { ...state, command: { type: 'idle' } },
            effect: { type: op, range: makeLineRange(state.cursor, count) },
        };
    }
    if (/^[1-9]$/.test(char)) {
        return {
            newState: {
                ...state,
                command: { type: 'operatorCount', op, count, digits: char },
            },
            effect: { type: 'none' },
        };
    }
    if (char === 'i' || char === 'a') {
        return {
            newState: {
                ...state,
                command: {
                    type: 'operatorTextObj',
                    op,
                    count,
                    scope: { type: char === 'i' ? 'inner' : 'around' }
                },
            },
            effect: { type: 'none' },
        };
    }
    const motion = SIMPLE_MOTIONS[char];
    if (motion) {
        return executeOperatorMotion(state, op, motion, count);
    }
    return {
        newState: { ...state, command: { type: 'idle' } },
        effect: { type: 'none' },
    };
}
function fromOperatorCount(state, key) {
    const ocState = state.command;
    const { op, count, digits } = ocState;
    const char = key.name;
    if (/^[0-9]$/.test(char)) {
        return {
            newState: {
                ...state,
                command: { type: 'operatorCount', op, count, digits: digits + char },
            },
            effect: { type: 'none' },
        };
    }
    const fullCount = parseInt(digits, 10) * count;
    const motion = SIMPLE_MOTIONS[char];
    if (motion) {
        return executeOperatorMotion(state, op, motion, fullCount);
    }
    return {
        newState: { ...state, command: { type: 'idle' } },
        effect: { type: 'none' },
    };
}
function fromOperatorTextObj(state, key) {
    const otState = state.command;
    const { op, count, scope } = otState;
    const char = key.name;
    if (char === '"' || char === "'" || char === '`') {
        return {
            newState: { ...state, command: { type: 'idle' } },
            effect: { type: op, range: { start: state.cursor, end: { ...state.cursor, col: state.cursor.col + 1 } } },
        };
    }
    if (char === '(' || char === ')' || char === 'b') {
        return {
            newState: { ...state, command: { type: 'idle' } },
            effect: { type: op, range: { start: state.cursor, end: { ...state.cursor, col: state.cursor.col + 1 } } },
        };
    }
    if (char === 'w' || char === 'W') {
        return {
            newState: { ...state, command: { type: 'idle' } },
            effect: { type: op, range: { start: state.cursor, end: { ...state.cursor, col: state.cursor.col + 1 } } },
        };
    }
    return {
        newState: { ...state, command: { type: 'idle' } },
        effect: { type: 'none' },
    };
}
function fromFind(state, key) {
    const findState = state.command;
    const { find, count } = findState;
    const char = key.name;
    if (char.length === 1) {
        const newFind = { ...find, char };
        return {
            newState: { ...state, command: { type: 'idle' } },
            effect: { type: 'move', delta: { col: 1 } },
        };
    }
    return {
        newState: { ...state, command: { type: 'idle' } },
        effect: { type: 'none' },
    };
}
function fromG(state, key) {
    const char = key.name;
    if (char === 'g') {
        return handleMotion(state, 'top');
    }
    return {
        newState: { ...state, command: { type: 'idle' } },
        effect: { type: 'none' },
    };
}
function fromReplace(state, key) {
    const char = key.name;
    if (char.length === 1) {
        return {
            newState: { ...state, command: { type: 'idle' } },
            effect: {
                type: 'change',
                range: {
                    start: state.cursor,
                    end: { ...state.cursor, col: state.cursor.col + 1 }
                }
            },
        };
    }
    return {
        newState: { ...state, command: { type: 'idle' } },
        effect: { type: 'none' },
    };
}
function fromIndent(state, key) {
    const indentState = state.command;
    const { dir, count } = indentState;
    const char = key.name;
    if (char === '>' || char === '<') {
        return {
            newState: { ...state, command: { type: 'idle' } },
            effect: { type: 'none' },
        };
    }
    return {
        newState: { ...state, command: { type: 'idle' } },
        effect: { type: 'none' },
    };
}
function enterOperatorState(state, op) {
    return {
        newState: {
            ...state,
            command: { type: 'operator', op, count: 1 },
        },
        effect: { type: 'none' },
    };
}
function handleCountPrefix(state, digit) {
    return {
        newState: {
            ...state,
            command: { type: 'count', digits: digit },
        },
        effect: { type: 'none' },
    };
}
function handleCountDigit(state, digit) {
    const currentCommand = state.command;
    if (currentCommand.type === 'count') {
        return {
            newState: {
                ...state,
                command: { type: 'count', digits: currentCommand.digits + digit },
            },
            effect: { type: 'none' },
        };
    }
    if (currentCommand.type === 'operatorCount') {
        return {
            newState: {
                ...state,
                command: {
                    type: 'operatorCount',
                    op: currentCommand.op,
                    count: currentCommand.count,
                    digits: currentCommand.digits + digit
                },
            },
            effect: { type: 'none' },
        };
    }
    return { newState: state, effect: { type: 'none' } };
}
function handleMotion(state, motion) {
    return {
        newState: { ...state, command: { type: 'idle' } },
        effect: { type: 'move', delta: MOTION_DELTAS[motion] ?? {} },
    };
}
function handleCountedMotion(state, motion, count) {
    const delta = MOTION_DELTAS[motion] ?? {};
    return {
        newState: { ...state, command: { type: 'idle' } },
        effect: {
            type: 'move',
            delta: {
                line: (delta.line ?? 0) * count,
                col: (delta.col ?? 0) * count,
            }
        },
    };
}
function executeOperatorMotion(state, op, motion, count) {
    return {
        newState: { ...state, command: { type: 'idle' } },
        effect: {
            type: op,
            range: {
                start: state.cursor,
                end: { line: state.cursor.line, col: state.cursor.col + count }
            }
        },
    };
}
function makeLineRange(cursor, count) {
    return {
        start: { line: cursor.line, col: 0 },
        end: { line: cursor.line + count - 1, col: Infinity },
    };
}
const SIMPLE_MOTIONS = {
    'h': 'left',
    'j': 'down',
    'k': 'up',
    'l': 'right',
    'w': 'word-next',
    'b': 'word-prev',
    'e': 'word-end',
    '^': 'first-nonblank',
    '$': 'end',
    '0': 'start',
};
const MOTION_DELTAS = {
    'left': { col: -1 },
    'down': { line: 1 },
    'up': { line: -1 },
    'right': { col: 1 },
    'word-next': { col: 1 },
    'word-prev': { col: -1 },
    'end': { col: Infinity },
    'start': { col: -Infinity },
    'top': { line: -Infinity },
};
//# sourceMappingURL=transitions.js.map