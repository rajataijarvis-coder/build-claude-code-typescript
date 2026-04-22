/**
 * Bounded UUID Set
 *
 * O(1) lookup, O(capacity) memory, FIFO eviction via circular buffer.
 * Used for echo deduplication in bridge protocols.
 *
 * Key properties:
 * - Fixed memory regardless of insert rate
 * - No timers or TTLs
 * - Automatic eviction of oldest entries
 */
export declare class BoundedUUIDSet {
    private capacity;
    private buffer;
    private set;
    private head;
    /**
     * Create a bounded UUID set
     * @param capacity Maximum number of UUIDs to track
     */
    constructor(capacity: number);
    /**
     * Add a UUID to the set
     * If at capacity, evicts the oldest entry (FIFO)
     */
    add(uuid: string): void;
    /**
     * Check if UUID is in the set
     * O(1) lookup via Set
     */
    has(uuid: string): boolean;
    /**
     * Current size of the set
     */
    get size(): number;
    /**
     * Clear all entries
     */
    clear(): void;
    /**
     * Get all UUIDs (for debugging)
     */
    entries(): string[];
}
/**
 * Create a pair of bounded UUID sets for bridge deduplication
 *
 * Two sets run in parallel:
 * - recentPostedUUIDs: UUIDs we've sent (check for echo)
 * - recentInboundUUIDs: UUIDs we've received (check for redelivery)
 */
export declare function createDeduplicationSets(capacity?: number): {
    posted: BoundedUUIDSet;
    inbound: BoundedUUIDSet;
};
/**
 * Deduplication result
 */
export interface DeduplicationResult {
    /** Whether this is an echo (we sent it) */
    isEcho: boolean;
    /** Whether this is a redelivery (we already received it) */
    isRedelivery: boolean;
    /** Whether the message should be processed */
    shouldProcess: boolean;
}
/**
 * Check UUID against deduplication sets
 */
export declare function checkDeduplication(uuid: string, posted: BoundedUUIDSet, inbound: BoundedUUIDSet): DeduplicationResult;
//# sourceMappingURL=BoundedUUIDSet.d.ts.map