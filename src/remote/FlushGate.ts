/**
 * Flush Gate
 * 
 * Queues live writes during history flush POST and drains them
 * in order when it completes. Prevents message reordering during
 * connection handshakes.
 */

import { BridgeMessage } from './types.js';

interface QueuedMessage {
  message: BridgeMessage;
  resolve: (value: void | PromiseLike<void>) => void;
  reject: (reason?: Error) => void;
}

/**
 * Flush gate -- ensures message ordering during bulk operations
 * 
 * Pattern:
 * 1. Call enter() before starting bulk operation (e.g., history flush)
 * 2. Messages sent during flush are queued
 * 3. Call exit() when bulk operation completes
 * 4. Queued messages are drained in order
 */
export class FlushGate {
  private isFlushing = false;
  private queue: QueuedMessage[] = [];
  
  /**
   * Enter flush mode -- messages will be queued
   */
  enter(): void {
    this.isFlushing = true;
  }
  
  /**
   * Exit flush mode -- drain queued messages
   */
  async exit(): Promise<void> {
    this.isFlushing = false;
    
    // Drain queue in order (FIFO)
    while (this.queue.length > 0) {
      const queued = this.queue.shift();
      if (queued) {
        try {
          await this.processMessage(queued.message);
          queued.resolve();
        } catch (error) {
          queued.reject(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }
  }
  
  /**
   * Send a message through the gate
   * If flushing, queues the message. Otherwise sends immediately.
   */
  async send(message: BridgeMessage, sender: (msg: BridgeMessage) => Promise<void>): Promise<void> {
    if (this.isFlushing) {
      // Queue the message
      return new Promise((resolve, reject) => {
        this.queue.push({ message, resolve, reject });
      });
    }
    
    // Send immediately
    await sender(message);
  }
  
  /**
   * Process a single message
   * Override in subclass for actual sending logic
   */
  protected async processMessage(message: BridgeMessage): Promise<void> {
    // Base implementation -- subclasses override
    throw new Error('processMessage must be implemented by subclass');
  }
  
  /**
   * Check if currently flushing
   */
  get flushing(): boolean {
    return this.isFlushing;
  }
  
  /**
   * Get queue length (for debugging)
   */
  get queueLength(): number {
    return this.queue.length;
  }
  
  /**
   * Clear the queue (on error/reset)
   */
  clear(): void {
    // Reject all pending
    for (const queued of this.queue) {
      queued.reject(new Error('Flush gate cleared'));
    }
    this.queue = [];
    this.isFlushing = false;
  }
}

/**
 * Flush gate with callback-based message processing
 */
export class CallbackFlushGate extends FlushGate {
  constructor(private processor: (message: BridgeMessage) => Promise<void>) {
    super();
  }
  
  protected async processMessage(message: BridgeMessage): Promise<void> {
    await this.processor(message);
  }
}

/**
 * Create a flush gate that wraps a send function
 */
export function createFlushGate(
  sender: (message: BridgeMessage) => Promise<void>
): FlushGate {
  return new CallbackFlushGate(sender);
}
