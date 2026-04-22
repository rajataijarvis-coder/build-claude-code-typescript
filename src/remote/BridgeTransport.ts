/**
 * Bridge Transport Base
 * 
 * Abstract base class unifying Bridge v1 and v2 behind a common interface.
 * Handles: message routing, echo deduplication, reconnection logic.
 */

import {
  BridgeTransport as IBridgeTransport,
  BridgeState,
  BridgeMessage,
  MessageHandler,
  WebSocketCloseCode,
  getReconnectionStrategy,
  ReconnectionStrategy,
} from './types.js';
import { BoundedUUIDSet, createDeduplicationSets, checkDeduplication } from './BoundedUUIDSet.js';
import { FlushGate, createFlushGate } from './FlushGate.js';

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
export abstract class BridgeTransport implements IBridgeTransport {
  state: BridgeState = 'connecting';
  onMessage?: MessageHandler;
  onStateChange?: (state: BridgeState) => void;
  
  protected config: BridgeTransportConfig;
  protected dedupSets: { posted: BoundedUUIDSet; inbound: BoundedUUIDSet };
  protected flushGate: FlushGate;
  protected reconnectAttempt = 0;
  protected reconnectTimer?: NodeJS.Timeout;
  
  constructor(config: BridgeTransportConfig) {
    this.config = config;
    this.dedupSets = createDeduplicationSets(2000);
    this.flushGate = createFlushGate((msg) => this.doSend(msg));
  }
  
  /**
   * Connect to the bridge
   */
  abstract connect(): Promise<void>;
  
  /**
   * Send a message (public API)
   * Tracks UUIDs for echo deduplication
   */
  async send(message: BridgeMessage): Promise<void> {
    // Track UUIDs we send
    if ('uuid' in message && message.uuid) {
      this.dedupSets.posted.add(message.uuid);
    }
    
    // Pass through flush gate for ordering
    await this.flushGate.send(message, (msg) => this.doSend(msg));
  }
  
  /**
   * Send message implementation (subclass override)
   */
  protected abstract doSend(message: BridgeMessage): Promise<void>;
  
  /**
   * Receive message (called by subclass)
   * Handles deduplication and routing
   */
  protected receiveMessage(message: BridgeMessage): void {
    // Check for echo/redelivery
    if ('uuid' in message && message.uuid) {
      const result = checkDeduplication(
        message.uuid,
        this.dedupSets.posted,
        this.dedupSets.inbound
      );
      
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
  async close(): Promise<void> {
    this.setState('closed');
    this.clearReconnectTimer();
    this.flushGate.clear();
  }
  
  /**
   * Handle connection error
   * Triggers reconnection with appropriate strategy
   */
  protected handleError(error: Error, closeCode?: number): void {
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
  private scheduleReconnect(strategy: ReconnectionStrategy): void {
    this.clearReconnectTimer();
    
    const delay = Math.min(
      strategy.initialDelay * Math.pow(strategy.multiplier, this.reconnectAttempt),
      strategy.maxDelay
    );
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempt++;
      this.attemptReconnect();
    }, delay);
  }
  
  /**
   * Attempt reconnection (subclass implements)
   */
  protected abstract attemptReconnect(): Promise<void>;
  
  /**
   * Clear reconnection timer
   */
  protected clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }
  
  /**
   * Set state and notify
   */
  protected setState(state: BridgeState): void {
    if (this.state !== state) {
      this.state = state;
      this.onStateChange?.(state);
    }
  }
  
  /**
   * Reset reconnection counter on successful connection
   */
  protected onConnected(): void {
    this.reconnectAttempt = 0;
    this.setState('connected');
  }
  
  /**
   * Enter flush mode (for history sync)
   */
  enterFlush(): void {
    this.flushGate.enter();
  }
  
  /**
   * Exit flush mode and drain queue
   */
  async exitFlush(): Promise<void> {
    await this.flushGate.exit();
  }
}

/**
 * Parse SSE event from stream chunk
 */
export function parseSSEEvent(chunk: string): Array<{ event?: string; data: string }> {
  const events: Array<{ event?: string; data: string }> = [];
  const lines = chunk.split('\n');
  
  let currentEvent: string | undefined;
  let currentData = '';
  
  for (const line of lines) {
    if (line.startsWith('event: ')) {
      currentEvent = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      currentData = line.slice(6);
    } else if (line === '') {
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
export function parseSSEData(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}
