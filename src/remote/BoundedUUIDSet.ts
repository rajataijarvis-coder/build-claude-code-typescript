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
  private buffer: (string | undefined)[];
  private set: Set<string>;
  private head = 0;
  
  /**
   * Create a bounded UUID set
   * @param capacity Maximum number of UUIDs to track
   */
  constructor(private capacity: number) {
    this.buffer = new Array<string | undefined>(capacity);
    this.set = new Set();
  }
  
  /**
   * Add a UUID to the set
   * If at capacity, evicts the oldest entry (FIFO)
   */
  add(uuid: string): void {
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
  has(uuid: string): boolean {
    return this.set.has(uuid);
  }
  
  /**
   * Current size of the set
   */
  get size(): number {
    return this.set.size;
  }
  
  /**
   * Clear all entries
   */
  clear(): void {
    this.set.clear();
    this.buffer.fill(undefined);
    this.head = 0;
  }
  
  /**
   * Get all UUIDs (for debugging)
   */
  entries(): string[] {
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
export function createDeduplicationSets(capacity = 2000): {
  posted: BoundedUUIDSet;
  inbound: BoundedUUIDSet;
} {
  return {
    posted: new BoundedUUIDSet(capacity),
    inbound: new BoundedUUIDSet(capacity),
  };
}

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
export function checkDeduplication(
  uuid: string,
  posted: BoundedUUIDSet,
  inbound: BoundedUUIDSet
): DeduplicationResult {
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
