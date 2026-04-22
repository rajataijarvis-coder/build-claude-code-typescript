/**
 * Performance Profiler
 *
 * Checkpoint-based profiling for startup and runtime performance.
 * Used to identify bottlenecks before optimizing.
 */
import { performance } from 'node:perf_hooks';
/** Global profiler state */
class Profiler {
    checkpoints = [];
    startTime = 0;
    config = {
        enabled: true,
        sampleRate: 1.0,
        maxCheckpoints: 100,
    };
    isSampling = true;
    /**
     * Initialize the profiler
     */
    initialize(config) {
        this.config = { ...this.config, ...config };
        // Determine if this session should be sampled
        this.isSampling = Math.random() < this.config.sampleRate;
        if (this.config.enabled && this.isSampling) {
            this.startTime = performance.now();
            this.checkpoints = [];
        }
    }
    /**
     * Record a checkpoint
     */
    checkpoint(name) {
        if (!this.config.enabled || !this.isSampling) {
            return null;
        }
        const now = performance.now();
        const elapsed = now - this.startTime;
        const lastCheckpoint = this.checkpoints.at(-1);
        const delta = lastCheckpoint ? elapsed - lastCheckpoint.elapsed : 0;
        const checkpoint = {
            name,
            timestamp: now,
            elapsed,
            delta,
        };
        this.checkpoints.push(checkpoint);
        // Keep within max limit
        if (this.checkpoints.length > this.config.maxCheckpoints) {
            this.checkpoints.shift();
        }
        return checkpoint;
    }
    /**
     * Get all recorded checkpoints
     */
    getCheckpoints() {
        return [...this.checkpoints];
    }
    /**
     * Get checkpoint report as formatted string
     */
    getReport() {
        if (!this.config.enabled || !this.isSampling) {
            return 'Profiling disabled or not sampled';
        }
        if (this.checkpoints.length === 0) {
            return 'No checkpoints recorded';
        }
        const lines = [];
        lines.push('═'.repeat(60));
        lines.push('PERFORMANCE PROFILE');
        lines.push('═'.repeat(60));
        lines.push(`Total elapsed: ${this.checkpoints.at(-1).elapsed.toFixed(2)}ms`);
        lines.push(`Checkpoints: ${this.checkpoints.length}`);
        lines.push('─'.repeat(60));
        lines.push(`${'Checkpoint'.padEnd(30)} ${'Delta'.padStart(10)} ${'Total'.padStart(10)}`);
        lines.push('─'.repeat(60));
        for (const cp of this.checkpoints) {
            const name = cp.name.length > 28 ? cp.name.slice(0, 28) + '..' : cp.name;
            lines.push(`${name.padEnd(30)} ` +
                `${cp.delta.toFixed(2).padStart(8)}ms ` +
                `${cp.elapsed.toFixed(2).padStart(8)}ms`);
        }
        lines.push('═'.repeat(60));
        return lines.join('\n');
    }
    /**
     * Reset the profiler
     */
    reset() {
        this.checkpoints = [];
        this.startTime = performance.now();
    }
}
// Global profiler instance
export const profiler = new Profiler();
/**
 * Convenience function for recording checkpoints
 */
export function profileCheckpoint(name) {
    return profiler.checkpoint(name);
}
//# sourceMappingURL=profiler.js.map