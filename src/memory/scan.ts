/**
 * Memory File Scanning
 * 
 * Efficient frontmatter extraction with 30-line limit.
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import type { MemoryFile, MemoryFrontmatter } from './types.js';

/**
 * Extract YAML frontmatter from file content
 * Reads only first 30 lines for efficiency
 */
export function extractFrontmatter(content: string): {
  frontmatter: MemoryFrontmatter | null;
  body: string;
} {
  const lines = content.split('\n');
  
  // Must start with ---
  if (lines[0]?.trim() !== '---') {
    return { frontmatter: null, body: content };
  }
  
  // Find closing ---
  const endIndex = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
  if (endIndex === -1) {
    return { frontmatter: null, body: content };
  }
  
  // Parse YAML (simplified - production uses proper YAML parser)
  const yamlLines = lines.slice(1, endIndex);
  const frontmatter: { name?: string; description?: string; type?: string } = {};

  for (const line of yamlLines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      if (key === 'name' || key === 'description' || key === 'type') {
        frontmatter[key] = value.trim();
      }
    }
  }
  
  const body = lines.slice(endIndex + 1).join('\n');
  
  // Validate required fields
  if (!frontmatter.name || !frontmatter.description || !frontmatter.type) {
    return { frontmatter: null, body };
  }

  // Validate type is one of the allowed values
  const validTypes = ['user', 'feedback', 'project', 'reference'];
  if (!validTypes.includes(frontmatter.type)) {
    return { frontmatter: null, body };
  }

  return {
    frontmatter: frontmatter as MemoryFrontmatter,
    body
  };
}

/**
 * Scan directory for memory files
 * Only reads first 30 lines of each file for frontmatter extraction
 */
export async function scanMemoryFiles(memoryDir: string): Promise<MemoryFile[]> {
  const files: MemoryFile[] = [];
  
  try {
    const entries = await readdir(memoryDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) {
        continue;
      }
      // Skip the index itself and team subdir files
      if (entry.name === 'MEMORY.md' || entry.name.startsWith('team-')) {
        continue;
      }
      
      const filePath = join(memoryDir, entry.name);
      const stats = await stat(filePath);
      
      // Read only first 30 lines for frontmatter
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n').slice(0, 30).join('\n');
      const { frontmatter } = extractFrontmatter(lines);
      
      if (frontmatter) {
        files.push({
          path: filePath,
          frontmatter,
          body: '', // Loaded on demand
          mtime: stats.mtimeMs,
          size: stats.size
        });
      }
    }
  } catch (error) {
    // Directory may not exist yet
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
  
  return files;
}
