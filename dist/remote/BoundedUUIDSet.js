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
export class BoundedUUIDSet {
    capacity;
    buffer;
    set;
    head = 0;
    /**
     * Create a bounded UUID set
     * @param capacity Maximum number of UUIDs to track
     */
    constructor(capacity) {
        this.capacity = capacity;
        this.buffer = new Array(capacity);
        this.set = new Set();
    }
    /**
     * Add a UUID to the set
     * If at capacity, evicts the oldest entry (FIFO)
     */
    add(uuid) {
        // Already present? No-op
        if (this.set.has(uuid)) {
            return;
        }
        // Evict oldest if at capacity
        if (this.set.size >= this.capacity) {
            const oldest = this.buffer[this.head];
            if (oldest !== undefined) {
                this.set.delete(oldest);
            }
        }
        // Add new entry
        this.buffer[this.head] = uuid;
        this.set.add(uuid);
        // Advance head (circular)
        this.head = (this.head + 1) % this.capacity;
    }
    /**
     * Check if UUID is in the set
     * O(1) lookup via Set
     */
    has(uuid) {
        return this.set.has(uuid);
    }
    /**
     * Current size of the set
     */
    get size() {
        return this.set.size;
    }
    /**
     * Clear all entries
     */
    clear() {
        this.set.clear();
        this.buffer.fill(undefined);
        this.head = 0;
    }
    /**
     * Get all UUIDs (for debugging)
     */
    entries() {
        return Array.from(this.set);
    }
}
/**
 * Create a pair of bounded UUID sets for bridge deduplication
 *
 * Two sets run in parallel:
 * - recentPostedUUIDs: UUIDs we've sent (check for echo)
 * - recentInboundUUIDs: UUIDs we've received (check for redelivery)
 */
export function createDeduplicationSets(capacity = 2000) {
    return {
        posted: new BoundedUUIDSet(capacity),
        inbound: new BoundedUUIDSet(capacity),
    };
}
/**
 * Check UUID against deduplication sets
 */
export function checkDeduplication(uuid, posted, inbound) {
    const isEcho = posted.has(uuid);
    const isRedelivery = inbound.has(uuid);
    if (!isRedelivery) {
        inbound.add(uuid);
    }
    return {
        isEcho,
        isRedelivery,
        shouldProcess: !isEcho && !isRedelivery,
    };
}
//# sourceMappingURL=BoundedUUIDSet.js.map