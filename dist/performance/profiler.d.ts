/**
 * Performance Profiler
 *
 * Checkpoint-based profiling for startup and runtime performance.
 * Used to identify bottlenecks before optimizing.
 */
/** Profiling checkpoint data */
export interface Checkpoint {
    name: string;
    timestamp: number;
    elapsed: number;
    delta: number;
}
/** Profiler configuration */
export interface ProfilerConfig {
    enabled: boolean;
    sampleRate: number;
    maxCheckpoints: number;
}
/** Global profiler state */
declare class Profiler {
    private checkpoints;
    private startTime;
    private config;
    private isSampling;
    /**
     * Initialize the profiler
     */
    initialize(config?: Partial<ProfilerConfig>): void;
    /**
     * Record a checkpoint
     */
    checkpoint(name: string): Checkpoint | null;
    /**
     * Get all recorded checkpoints
     */
    getCheckpoints(): ReadonlyArray<Checkpoint>;
    /**
     * Get checkpoint report as formatted string
     */
    getReport(): string;
    /**
     * Reset the profiler
     */
    reset(): void;
}
export declare const profiler: Profiler;
/**
 * Convenience function for recording checkpoints
 */
export declare function profileCheckpoint(name: string): Checkpoint | null;
export {};
//# sourceMappingURL=profiler.d.ts.map