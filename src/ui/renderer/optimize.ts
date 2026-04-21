/**
 * Patch optimization and terminal output.
 */

import { Patch } from './diff.js';

export interface OptimizedPatch {
  type: 'stdout' | 'cursor' | 'clear';
  content: string;
}

export function optimizePatches(patches: Patch[]): OptimizedPatch[] {
  const optimized: OptimizedPatch[] = [];
  let prevEndCol = -1;
  let prevRow = -1;

  for (const patch of patches) {
    if (
      prevRow === patch.row &&
      prevEndCol === patch.startCol - 1
    ) {
      const last = optimized[optimized.length - 1];
      if (last) {
        last.content += patch.content.replace(/^\x1b\[\d+;\d+H/, '');
      }
    } else {
      optimized.push({
        type: 'stdout',
        content: patch.content,
      });
    }

    prevRow = patch.row;
    prevEndCol = patch.endCol;
  }

  return optimized;
}

export async function writeToStdout(
  patches: OptimizedPatch[]
): Promise<void> {
  if (patches.length === 0) return;

  let output = '\x1b[?2026h';

  for (const patch of patches) {
    output += patch.content;
  }

  output += '\x1b[?2026l';

  process.stdout.write(output);
}
