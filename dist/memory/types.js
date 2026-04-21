/**
 * Memory System Types
 *
 * File-based memory with LLM-powered recall.
 */
/**
 * System prompt for the Sonnet side-query
 */
export const RECALL_SELECTOR_PROMPT = `You are a memory relevance selector.

Given:
1. A manifest of available memory files (type, name, date, description)
2. The user's current query
3. Recently used tools (to avoid redundant documentation)

Select up to 5 memory files that would be MOST useful for the current query.

Guidelines:
- Be conservative: include only if clearly relevant
- Skip memories for tools already in active use (unless they contain warnings/gotchas)
- Prefer recent memories over old ones when relevance is equal
- Consider memory type: user and feedback memories are usually high-value

Respond with JSON:
{
  "selectedFiles": ["filename1.md", "filename2.md"],
  "reasoning": "Brief explanation of selection rationale"
}`;
//# sourceMappingURL=types.js.map