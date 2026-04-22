/**
 * Flush Gate
 *
 * Queues live writes during history flush POST and drains them
 * in order when it completes. Prevents message reordering during
 * connection handshakes.
 */
import { BridgeMessage } from './types.js';
/**
 * Flush gate -- ensures message ordering during bulk operations
 *
 * Pattern:
 * 1. Call enter() before starting bulk operation (e.g., history flush)
 * 2. Messages sent during flush are queued
 * 3. Call exit() when bulk operation completes
 * 4. Queued messages are drained in order
 */
export declare class FlushGate {
    private isFlushing;
    private queue;
    /**
     * Enter flush mode -- messages will be queued
     */
    enter(): void;
    /**
     * Exit flush mode -- drain queued messages
     */
    exit(): Promise<void>;
    /**
     * Send a message through the gate
     * If flushing, queues the message. Otherwise sends immediately.
     */
    send(message: BridgeMessage, sender: (msg: BridgeMessage) => Promise<void>): Promise<void>;
    /**
     * Process a single message
     * Override in subclass for actual sending logic
     */
    protected processMessage(message: BridgeMessage): Promise<void>;
    /**
     * Check if currently flushing
     */
    get flushing(): boolean;
    /**
     * Get queue length (for debugging)
     */
    get queueLength(): number;
    /**
     * Clear the queue (on error/reset)
     */
    clear(): void;
}
/**
 * Flush gate with callback-based message processing
 */
export declare class CallbackFlushGate extends FlushGate {
    private processor;
    constructor(processor: (message: BridgeMessage) => Promise<void>);
    protected processMessage(message: BridgeMessage): Promise<void>;
}
/**
 * Create a flush gate that wraps a send function
 */
export declare function createFlushGate(sender: (message: BridgeMessage) => Promise<void>): FlushGate;
//# sourceMappingURL=FlushGate.d.ts.map