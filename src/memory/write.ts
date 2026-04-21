/**
 * Memory Write Operations
 * 
 * Two-step protocol: create file, update index.
 */

import { join } from 'path';
import { writeFile, appendFile, mkdir } from 'fs/promises';
import type { MemoryFrontmatter } from './types.js';

/**
 * Format memory content with frontmatter
 */
export function formatMemoryContent(
  frontmatter: MemoryFrontmatter,
  body: string
): string {
  const yaml = [
    '---',
    `name: ${frontmatter.name}`,
    `description: ${frontmatter.description}`,
    `type: ${frontmatter.type}`,
    '---',
    '',
    body
  ].join('\n');
  
  return yaml;
}

/**
 * Format a single index entry
 * Must stay under ~150 characters
 */
export function formatIndexEntry(
  filename: string,
  description: string
): string {
  const entry = `- [${filename}](${filename}) -- ${description}`;
  // Hard cap enforcement
  if (entry.length > 150) {
    return entry.slice(0, 147) + '...';
  }
  return entry;
}

/**
 * Two-step memory write protocol
 * 
 * Step 1: Create the memory file
 * Step 2: Update the MEMORY.md index
 */
export async function writeMemory(
  memoryDir: string,
  filename: string,
  frontmatter: MemoryFrontmatter,
  body: string
): Promise<void> {
  // Ensure directory exists
  await mkdir(memoryDir, { recursive: true });
  
  // Step 1: Write the memory file
  const content = formatMemoryContent(frontmatter, body);
  const filePath = join(memoryDir, filename);
  await writeFile(filePath, content, 'utf-8');
  
  // Step 2: Update the index
  const indexPath = join(memoryDir, 'MEMORY.md');
  const indexEntry = formatIndexEntry(filename, frontmatter.description);
  await appendFile(indexPath, indexEntry + '\n', 'utf-8');
}

/**
 * Update an existing memory file
 * Preserves frontmatter, replaces body
 */
export async function updateMemoryBody(
  filePath: string,
  newBody: string
): Promise<void> {
  const { readFile } = await import('fs/promises');
  const existing = await readFile(filePath, 'utf-8');
  const endIndex = existing.indexOf('---', 3);
  const frontmatter = existing.slice(0, endIndex + 3);
  const updated = frontmatter + '\n\n' + newBody;
  await writeFile(filePath, updated, 'utf-8');
}

/**
 * Delete a memory file and update index
 * (Note: Index cleanup is batched, not immediate)
 */
export async function deleteMemory(
  memoryDir: string,
  filename: string
): Promise<void> {
  const { unlink } = await import('fs/promises');
  const filePath = join(memoryDir, filename);
  await unlink(filePath);
  // Index cleanup happens during prune phase
}
