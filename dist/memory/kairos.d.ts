/**
 * KAIROS Mode: Continuous Operation
 *
 * Append-only daily logs and /dream consolidation.
 */
/**
 * Get daily log path for KAIROS mode
 *
 * Pattern-based in prompt: model derives date from date_change attachment.
 * This allows prompt caching across midnight (date doesn't invalidate cache).
 */
export declare function getDailyLogPath(memoryDir: string, date: Date): string;
/**
 * Append timestamped observation to daily log
 *
 * Model instruction: "Do not rewrite or reorganize the log"
 * Restructuring during capture loses the chronological signal.
 */
export declare function appendToDailyLog(logPath: string, observation: string): Promise<void>;
/**
 * Consolidation lock file
 *
 * Content = PID for mutual exclusion
 * Mtime = lastConsolidatedAt for scheduling
 */
export interface ConsolidationLock {
    holderPid: number;
    acquiredAt: number;
}
/**
 * Check if consolidation should run
 *
 * Gates evaluated cheapest-first:
 * 1. Hours since last consolidation > 24
 * 2. Sessions modified since then > 5
 * 3. No other process holds lock
 */
export declare function shouldConsolidate(lastConsolidatedAt: number, sessionsModified: number, isLocked: boolean): boolean;
/**
 * The /dream consolidation phases
 */
export type ConsolidationPhase = 'orient' | 'gather' | 'consolidate' | 'prune';
/**
 * Phase descriptions for the consolidating agent
 */
export declare const CONSOLIDATION_PHASES: Record<ConsolidationPhase, string>;
/**
 * Crash recovery: detect dead PIDs
 *
 * Uses process.kill(pid, 0) to check if a process exists.
 * One-hour staleness timeout as defense against PID reuse.
 */
export declare function isLockStale(lock: ConsolidationLock): boolean;
//# sourceMappingURL=kairos.d.ts.map