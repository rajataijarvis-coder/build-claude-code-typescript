/**
 * Task Output Management
 *
 * Disk-based output streaming for task communication.
 */
import { createWriteStream } from 'fs';
import { mkdir, symlink, readFile } from 'fs/promises';
import path from 'path';
/**
 * Create output file for a task
 */
export async function createTaskOutputFile(taskId, baseDir) {
    const outputDir = path.join(baseDir, '.claude', 'tasks');
    await mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `${taskId}.jsonl`);
    // Create symlink in latest/ subdirectory for easy discovery
    const latestDir = path.join(outputDir, 'latest');
    await mkdir(latestDir, { recursive: true });
    const symlinkPath = path.join(latestDir, `${taskId}.jsonl`);
    await symlink(outputPath, symlinkPath).catch(() => {
        // Ignore if symlink already exists
    });
    return outputPath;
}
/**
 * Write an entry to task output file
 */
export function writeTaskOutput(outputPath, entry) {
    const line = JSON.stringify(entry) + '\n';
    const stream = createWriteStream(outputPath, { flags: 'a' });
    stream.write(line);
    stream.end();
}
/**
 * Read task output file
 */
export async function readTaskOutput(outputPath) {
    try {
        const content = await readFile(outputPath, 'utf-8');
        return content
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));
    }
    catch {
        return [];
    }
}
/**
 * Calculate current file size
 */
export async function getOutputFileSize(outputPath) {
    try {
        const { stat } = await import('fs/promises');
        const stats = await stat(outputPath);
        return stats.size;
    }
    catch {
        return 0;
    }
}
//# sourceMappingURL=output.js.map