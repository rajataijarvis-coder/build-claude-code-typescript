/**
 * Task Output Management
 *
 * Disk-based output streaming for task communication.
 */
import { TaskOutput } from './types.js';
/**
 * Create output file for a task
 */
export declare function createTaskOutputFile(taskId: string, baseDir: string): Promise<string>;
/**
 * Write an entry to task output file
 */
export declare function writeTaskOutput(outputPath: string, entry: TaskOutput): void;
/**
 * Read task output file
 */
export declare function readTaskOutput(outputPath: string): Promise<TaskOutput[]>;
/**
 * Calculate current file size
 */
export declare function getOutputFileSize(outputPath: string): Promise<number>;
//# sourceMappingURL=output.d.ts.map