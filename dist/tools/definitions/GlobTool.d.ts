/**
 * GlobTool - Find files by pattern
 *
 * Simple file globbing for finding files.
 * Always concurrency-safe and read-only.
 */
import { z } from 'zod';
export declare const GlobTool: import("../types.js").Tool<z.ZodObject<{
    pattern: z.ZodString;
    path: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    pattern: string;
    path?: string | undefined;
    limit?: number | undefined;
}, {
    pattern: string;
    path?: string | undefined;
    limit?: number | undefined;
}>, string, unknown>;
//# sourceMappingURL=GlobTool.d.ts.map