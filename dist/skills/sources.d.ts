/**
 * Skill Sources
 *
 * Resolves skill directories from seven sources with precedence.
 */
import type { SkillSource } from './types.js';
/**
 * Options for resolving skill sources.
 */
export interface ResolveSkillSourcesOptions {
    projectDir?: string;
    additionalDirs?: string[];
    managedPath?: string;
}
/**
 * Resolve all skill sources in precedence order.
 * Higher priority wins when skills have the same name.
 */
export declare function resolveSkillSources(options: ResolveSkillSourcesOptions): Promise<SkillSource[]>;
/**
 * Filter sources by trust level.
 */
export declare function filterSourcesByTrust(sources: SkillSource[], allowedLevels: SkillSource['trustLevel'][]): SkillSource[];
/**
 * Check if a path is a skill file (ends with .md or .MD).
 */
export declare function isSkillFile(filename: string): boolean;
/**
 * Extract skill name from filename (removes extension, lowercases).
 */
export declare function extractSkillName(filename: string): string;
//# sourceMappingURL=sources.d.ts.map