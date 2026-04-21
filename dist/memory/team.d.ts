/**
 * Team Memory Security
 *
 * Defense in depth for shared memory directories.
 */
/**
 * Path traversal attack detection
 * Layer 1: Input sanitization
 */
export declare function sanitizePathKey(input: string): string;
/**
 * Layer 2 & 3: Path resolution and symlink checking
 */
export declare function resolveTeamPath(memoryDir: string, filename: string): Promise<string>;
export declare class PathTraversalError extends Error {
    constructor(message: string);
}
/**
 * Scope guidance for the model
 *
 * User memories: always private
 * Reference memories: usually team
 * Feedback memories: default to private unless project-wide
 *
 * Cross-check: Before saving a private feedback memory, check that
 * it does not contradict a team feedback memory.
 */
export declare function getScopeGuidance(type: string): string;
//# sourceMappingURL=team.d.ts.map