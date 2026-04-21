/**
 * ReadFileTool - The most versatile reader
 *
 * Reads text files, images, PDFs, and directories.
 * Self-bounds via token limits rather than maxResultSizeChars.
 */
import { z } from 'zod';
export declare const ReadFileTool: import("../types.js").Tool<z.ZodObject<{
    file_path: z.ZodString;
    offset: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    file_path: string;
    offset?: number | undefined;
    limit?: number | undefined;
}, {
    file_path: string;
    offset?: number | undefined;
    limit?: number | undefined;
}>, string, unknown>;
//# sourceMappingURL=ReadFileTool.d.ts.map