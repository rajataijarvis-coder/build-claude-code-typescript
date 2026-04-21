/**
 * WriteFileTool - Write content to files
 *
 * Creates new files or overwrites existing ones.
 * Always runs serially (not concurrency-safe) to prevent conflicts.
 */
import { z } from 'zod';
export declare const WriteFileTool: import("../types.js").Tool<z.ZodObject<{
    file_path: z.ZodString;
    content: z.ZodString;
    create_dirs: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    file_path: string;
    content: string;
    create_dirs?: boolean | undefined;
}, {
    file_path: string;
    content: string;
    create_dirs?: boolean | undefined;
}>, string, unknown>;
//# sourceMappingURL=WriteFileTool.d.ts.map