/**
 * Skills Loader
 *
 * Two-phase skill loading: frontmatter at startup, content on demand.
 */
import type { SkillSource, SkillIndex, LoadedSkill } from './types.js';
/**
 * Phase 1: Scan all skill sources and extract frontmatter.
 * Returns index of available skills without loading full content.
 */
export declare function scanSkills(sources: SkillSource[]): Promise<SkillIndex>;
/**
 * Format skills for system prompt (cheap - uses frontmatter only).
 */
export declare function formatSkillsForSystemPrompt(index: SkillIndex): string;
/**
 * Get skill by name (case-insensitive).
 */
export declare function getSkillByName(index: SkillIndex, name: string): LoadedSkill | undefined;
/**
 * Filter skills by tag.
 */
export declare function filterSkillsByTag(index: SkillIndex, tag: string): LoadedSkill[];
/**
 * Count skills by source.
 */
export declare function countSkillsBySource(index: SkillIndex): Map<string, number>;
//# sourceMappingURL=loader.d.ts.map