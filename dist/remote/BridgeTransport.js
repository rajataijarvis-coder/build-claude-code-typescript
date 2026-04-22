/**
 * Bridge Transport Base
 *
 * Abstract base class unifying Bridge v1 and v2 behind a common interface.
 * Handles: message routing, echo deduplication, reconnection logic.
 */
import { WebSocketCloseCode, getReconnectionStrategy, } from './types.js';
import { createDeduplicationSets, checkDeduplication } from './BoundedUUIDSet.js';
import { createFlushGate } from './FlushGate.js';
/**
 * Abstract bridge transport -- base for v1 and v2 implementations
 */
export class BridgeTransport {
    state = 'connecting';
    onMessage;
    onStateChange;
    config;
    dedupSets;
    flushGate;
    reconnectAttempt = 0;
    reconnectTimer;
    constructor(config) {
        this.config = config;
        this.dedupSets = createDeduplicationSets(2000);
        this.flushGate = createFlushGate((msg) => this.doSend(msg));
    }
    /**
     * Send a message (public API)
     * Tracks UUIDs for echo deduplication
     */
    async send(message) {
        // Track UUIDs we send
        if ('uuid' in message && message.uuid) {
            this.dedupSets.posted.add(message.uuid);
        }
        // Pass through flush gate for ordering
        await this.flushGate.send(message, (msg) => this.doSend(msg));
    }
    /**
     * Receive message (called by subclass)
     * Handles deduplication and routing
     */
    receiveMessage(message) {
        // Check for echo/redelivery
        if ('uuid' in message && message.uuid) {
            const result = checkDeduplication(message.uuid, this.dedupSets.posted, this.dedupSets.inbound);
            if (!result.shouldProcess) {
                return; // Drop echo or redelivery
            }
        }
        // Route to handler
        this.onMessage?.(message);
    }
    /**
     * Close the transport
     */
    async close() {
        this.setState('closed');
        this.clearReconnectTimer();
        this.flushGate.clear();
    }
    /**
     * Handle connection error
     * Triggers reconnection with appropriate strategy
     */
    handleError(error, closeCode) {
        console.error('Bridge transport error:', error);
        const code = closeCode ?? WebSocketCloseCode.ABNORMAL;
        const strategy = getReconnectionStrategy(code, this.reconnectAttempt);
        if (strategy.type === 'none' || this.reconnectAttempt >= strategy.maxRetries) {
            this.setState('failed');
            return;
        }
        this.setState('reconnecting');
        this.scheduleReconnect(strategy);
    }
    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect(strategy) {
        this.clearReconnectTimer();
        const delay = Math.min(strategy.initialDelay * Math.pow(strategy.multiplier, this.reconnectAttempt), strategy.maxDelay);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempt++;
            this.attemptReconnect();
        }, delay);
    }
    /**
     * Clear reconnection timer
     */
    clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }
    }
    /**
     * Set state and notify
     */
    setState(state) {
        if (this.state !== state) {
            this.state = state;
            this.onStateChange?.(state);
        }
    }
    /**
     * Reset reconnection counter on successful connection
     */
    onConnected() {
        this.reconnectAttempt = 0;
        this.setState('connected');
    }
    /**
     * Enter flush mode (for history sync)
     */
    enterFlush() {
        this.flushGate.enter();
    }
    /**
     * Exit flush mode and drain queue
     */
    async exitFlush() {
        await this.flushGate.exit();
    }
}
/**
 * Parse SSE event from stream chunk
 */
export function parseSSEEvent(chunk) {
    const events = [];
    const lines = chunk.split('\n');
    let currentEvent;
    let currentData = '';
    for (const line of lines) {
        if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
        }
        else if (line.startsWith('data: ')) {
            currentData = line.slice(6);
        }
        else if (line === '') {
            // End of event
            if (currentData) {
                events.push({ event: currentEvent, data: currentData });
                currentEvent = undefined;
                currentData = '';
            }
        }
    }
    // Handle trailing data without empty line
    if (currentData) {
        events.push({ event: currentEvent, data: currentData });
    }
    return events;
}
/**
 * Parse JSON from SSE data field
 */
export function parseSSEData(data) {
    try {
        return JSON.parse(data);
    }
    catch {
        return data;
    }
}
//# sourceMappingURL=BridgeTransport.js.map