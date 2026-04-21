/**
 * KAIROS Mode: Continuous Operation
 *
 * Append-only daily logs and /dream consolidation.
 */
import { join } from 'path';
import { appendFile, mkdir } from 'fs/promises';
/**
 * Get daily log path for KAIROS mode
 *
 * Pattern-based in prompt: model derives date from date_change attachment.
 * This allows prompt caching across midnight (date doesn't invalidate cache).
 */
export function getDailyLogPath(memoryDir, date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return join(memoryDir, 'logs', String(year), month, `${year}-${month}-${day}.md`);
}
/**
 * Append timestamped observation to daily log
 *
 * Model instruction: "Do not rewrite or reorganize the log"
 * Restructuring during capture loses the chronological signal.
 */
export async function appendToDailyLog(logPath, observation) {
    // Ensure directory exists
    const dir = logPath.slice(0, logPath.lastIndexOf('/'));
    await mkdir(dir, { recursive: true });
    const timestamp = new Date().toISOString();
    const entry = `- [${timestamp}] ${observation}\n`;
    await appendFile(logPath, entry, 'utf-8');
}
/**
 * Check if consolidation should run
 *
 * Gates evaluated cheapest-first:
 * 1. Hours since last consolidation > 24
 * 2. Sessions modified since then > 5
 * 3. No other process holds lock
 */
export function shouldConsolidate(lastConsolidatedAt, sessionsModified, isLocked) {
    // Gate 1: Hours since last consolidation > 24
    const hoursSince = (Date.now() - lastConsolidatedAt) / (1000 * 60 * 60);
    if (hoursSince <= 24)
        return false;
    // Gate 2: Sessions modified since then > 5
    if (sessionsModified < 5)
        return false;
    // Gate 3: No other process holds lock
    if (isLocked)
        return false;
    return true;
}
/**
 * Phase descriptions for the consolidating agent
 */
export const CONSOLIDATION_PHASES = {
    orient: 'List directory, read index, skim existing memory files',
    gather: 'Search logs, check for drifted memories',
    consolidate: 'Write or update files, MERGE into existing rather than duplicate',
    prune: 'Update index under 200 lines, remove stale pointers'
};
/**
 * Crash recovery: detect dead PIDs
 *
 * Uses process.kill(pid, 0) to check if a process exists.
 * One-hour staleness timeout as defense against PID reuse.
 */
export function isLockStale(lock) {
    const ageMs = Date.now() - lock.acquiredAt;
    if (ageMs > 60 * 60 * 1000)
        return true; // 1 hour
    try {
        process.kill(lock.holderPid, 0);
        return false; // Process still exists
    }
    catch {
        return true; // Process dead
    }
}
//# sourceMappingURL=kairos.js.map