/**
 * BashTool - Execute bash commands with concurrency classification
 *
 * The most complex tool because the same tool can be either
 * concurrency-safe or not depending on the command.
 */
import { z } from 'zod';
/**
 * Full command classification
 */
export declare function classifyCommand(command: string): {
    isReadOnly: boolean;
    isConcurrencySafe: boolean;
    subcommands: string[];
    hasBackground: boolean;
    hasPipe: boolean;
};
export declare const BashTool: import("../types.js").Tool<z.ZodObject<{
    command: z.ZodString;
    cwd: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    command: string;
    cwd?: string | undefined;
    timeout?: number | undefined;
}, {
    command: string;
    cwd?: string | undefined;
    timeout?: number | undefined;
}>, string, unknown>;
//# sourceMappingURL=BashTool.d.ts.map