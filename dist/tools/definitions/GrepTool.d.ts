/**
 * GrepTool - Search file contents
 *
 * Wraps ripgrep with pagination and exclusion patterns.
 * Always concurrency-safe and read-only.
 */
import { z } from 'zod';
export declare const GrepTool: import("../types.js").Tool<z.ZodObject<{
    pattern: z.ZodString;
    path: z.ZodOptional<z.ZodString>;
    file_pattern: z.ZodOptional<z.ZodString>;
    head_limit: z.ZodOptional<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    pattern: string;
    path?: string | undefined;
    offset?: number | undefined;
    file_pattern?: string | undefined;
    head_limit?: number | undefined;
}, {
    pattern: string;
    path?: string | undefined;
    offset?: number | undefined;
    file_pattern?: string | undefined;
    head_limit?: number | undefined;
}>, string, unknown>;
//# sourceMappingURL=GrepTool.d.ts.map