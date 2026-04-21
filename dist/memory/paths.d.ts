/**
 * Memory Path Resolution
 *
 * Git-scoped memory directories with path sanitization.
 */
/**
 * Resolve the memory directory for a project.
 * Git root takes precedence over working directory.
 */
export declare function resolveMemoryPath(gitRoot: string | null, workingDir: string): Promise<string>;
/**
 * Sanitize a path for use as a directory name.
 * Converts slashes to dashes, removes problematic characters.
 */
export declare function sanitizePath(input: string): string;
/**
 * Resolve team memory subdirectory path
 */
export declare function getTeamMemoryPath(memoryDir: string): string;
/**
 * Resolve daily log path for KAIROS mode
 */
export declare function getDailyLogPath(memoryDir: string, date: Date): string;
//# sourceMappingURL=paths.d.ts.map