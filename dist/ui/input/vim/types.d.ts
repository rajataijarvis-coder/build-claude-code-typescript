/**
 * Vim state machine types.
 */
export type VimMode = 'NORMAL' | 'INSERT' | 'VISUAL' | 'COMMAND';
export type CommandState = {
    type: 'idle';
} | {
    type: 'count';
    digits: string;
} | {
    type: 'operator';
    op: Operator;
    count: number;
} | {
    type: 'operatorCount';
    op: Operator;
    count: number;
    digits: string;
} | {
    type: 'operatorTextObj';
    op: Operator;
    count: number;
    scope: TextObjScope;
} | {
    type: 'find';
    find: FindType;
    count: number;
} | {
    type: 'g';
    count: number;
} | {
    type: 'replace';
    count: number;
} | {
    type: 'indent';
    dir: '>' | '<';
    count: number;
};
export type Operator = 'delete' | 'change' | 'yank';
export type TextObjScope = {
    type: 'inner';
} | {
    type: 'around';
};
export type FindType = {
    type: 'f';
    char: string;
} | {
    type: 'F';
    char: string;
} | {
    type: 't';
    char: string;
} | {
    type: 'T';
    char: string;
};
export interface VimState {
    mode: VimMode;
    command: CommandState;
    cursor: {
        line: number;
        col: number;
    };
}
export interface TransitionResult {
    newState: VimState;
    effect?: VimEffect;
}
export type VimEffect = {
    type: 'move';
    delta: {
        line?: number;
        col?: number;
    };
} | {
    type: 'delete';
    range: Range;
} | {
    type: 'change';
    range: Range;
} | {
    type: 'yank';
    range: Range;
} | {
    type: 'insert';
    text: string;
} | {
    type: 'switchMode';
    mode: VimMode;
} | {
    type: 'executeCommand';
    command: string;
} | {
    type: 'none';
};
export interface Range {
    start: {
        line: number;
        col: number;
    };
    end: {
        line: number;
        col: number;
    };
}
export declare function createVimState(): VimState;
//# sourceMappingURL=types.d.ts.map