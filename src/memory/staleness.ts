/**
 * Memory Staleness System
 * 
 * Treat old memories as hypotheses, not facts.
 */

/**
 * Calculate human-readable staleness warning
 * 
 * Memories from today or yesterday get no warning.
 * Everything older gets a caveat injected alongside content.
 */
export function calculateStaleness(mtime: number): string {
  const now = Date.now();
  const ageMs = now - mtime;
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  
  // Today or yesterday: no warning
  if (ageDays === 0) return '';
  if (ageDays === 1) return '';
  
  // Format human-readable age
  let ageText: string;
  if (ageDays < 7) {
    ageText = `${ageDays} days ago`;
  } else if (ageDays < 30) {
    ageText = `${Math.floor(ageDays / 7)} weeks ago`;
  } else if (ageDays < 365) {
    ageText = `${Math.floor(ageDays / 30)} months ago`;
  } else {
    ageText = `${Math.floor(ageDays / 365)} years ago`;
  }
  
  // Action-cue framing validated through evals
  // The phrase "Before recommending from memory" triggers the right
  // reasoning pattern in the model better than raw timestamps.
  return `This memory is from ${ageText}. Before recommending from memory, verify against current code since file:line citations and behavior claims may be outdated.`;
}

/**
 * Wrap memory content with staleness warning if applicable
 */
export function wrapWithStaleness(
  content: string,
  mtime: number
): string {
  const warning = calculateStaleness(mtime);
  if (!warning) return content;
  
  return `${warning}\n\n---\n\n${content}`;
}

/**
 * Get staleness level for UI display
 */
export type StalenessLevel = 'fresh' | 'recent' | 'stale' | 'ancient';

export function getStalenessLevel(mtime: number): StalenessLevel {
  const ageDays = (Date.now() - mtime) / (1000 * 60 * 60 * 24);
  
  if (ageDays < 2) return 'fresh';
  if (ageDays < 7) return 'recent';
  if (ageDays < 30) return 'stale';
  return 'ancient';
}

/**
 * Get emoji indicator for staleness level
 */
export function getStalenessEmoji(level: StalenessLevel): string {
  const emojis: Record<StalenessLevel, string> = {
    fresh: '✅',
    recent: '🟢',
    stale: '🟡',
    ancient: '🔴'
  };
  return emojis[level];
}
