/**
 * Bridge Transport Base
 *
 * Abstract base class unifying Bridge v1 and v2 behind a common interface.
 * Handles: message routing, echo deduplication, reconnection logic.
 */
import { BridgeTransport as IBridgeTransport, BridgeState, BridgeMessage, MessageHandler } from './types.js';
import { BoundedUUIDSet } from './BoundedUUIDSet.js';
import { FlushGate } from './FlushGate.js';
export interface BridgeTransportConfig {
    /** API base URL */
    apiBaseUrl: string;
    /** Authentication token getter */
    getAuthToken: () => Promise<string>;
    /** Max reconnection attempts */
    maxReconnectAttempts?: number;
}
/**
 * Abstract bridge transport -- base for v1 and v2 implementations
 */
export declare abstract class BridgeTransport implements IBridgeTransport {
    state: BridgeState;
    onMessage?: MessageHandler;
    onStateChange?: (state: BridgeState) => void;
    protected config: BridgeTransportConfig;
    protected dedupSets: {
        posted: BoundedUUIDSet;
        inbound: BoundedUUIDSet;
    };
    protected flushGate: FlushGate;
    protected reconnectAttempt: number;
    protected reconnectTimer?: NodeJS.Timeout;
    constructor(config: BridgeTransportConfig);
    /**
     * Connect to the bridge
     */
    abstract connect(): Promise<void>;
    /**
     * Send a message (public API)
     * Tracks UUIDs for echo deduplication
     */
    send(message: BridgeMessage): Promise<void>;
    /**
     * Send message implementation (subclass override)
     */
    protected abstract doSend(message: BridgeMessage): Promise<void>;
    /**
     * Receive message (called by subclass)
     * Handles deduplication and routing
     */
    protected receiveMessage(message: BridgeMessage): void;
    /**
     * Close the transport
     */
    close(): Promise<void>;
    /**
     * Handle connection error
     * Triggers reconnection with appropriate strategy
     */
    protected handleError(error: Error, closeCode?: number): void;
    /**
     * Schedule reconnection attempt
     */
    private scheduleReconnect;
    /**
     * Attempt reconnection (subclass implements)
     */
    protected abstract attemptReconnect(): Promise<void>;
    /**
     * Clear reconnection timer
     */
    protected clearReconnectTimer(): void;
    /**
     * Set state and notify
     */
    protected setState(state: BridgeState): void;
    /**
     * Reset reconnection counter on successful connection
     */
    protected onConnected(): void;
    /**
     * Enter flush mode (for history sync)
     */
    enterFlush(): void;
    /**
     * Exit flush mode and drain queue
     */
    exitFlush(): Promise<void>;
}
/**
 * Parse SSE event from stream chunk
 */
export declare function parseSSEEvent(chunk: string): Array<{
    event?: string;
    data: string;
}>;
/**
 * Parse JSON from SSE data field
 */
export declare function parseSSEData(data: string): unknown;
//# sourceMappingURL=BridgeTransport.d.ts.map