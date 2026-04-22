/**
 * Bridge v2 Transport
 * 
 * Direct sessions with SSE for reads, CCRClient for writes.
 * No polling, no Environments API -- just create session, connect bridge, open transport.
 */

import {
  BridgeTransportConfig,
  BridgeV2Session,
  BridgeV2Connection,
  BridgeMessage,
  CCRMessage,
  WebSocketCloseCode,
} from './types.js';
import { BridgeTransport, parseSSEEvent, parseSSEData } from './BridgeTransport.js';

interface BridgeV2Config extends BridgeTransportConfig {
  /** Session ID */
  sessionId: string;
  /** OAuth credentials */
  oauthToken: string;
}

/**
 * Bridge v2 transport implementation
 * 
 * Lifecycle:
 * 1. Create session: POST /v1/code/sessions
 * 2. Connect bridge: POST /v1/code/sessions/{id}/bridge (returns worker JWT)
 * 3. Open SSE for reads
 * 4. Use CCRClient for writes
 */
export class BridgeV2Transport extends BridgeTransport {
  private sessionId: string;
  private oauthToken: string;
  private workerJwt?: string;
  private workerEpoch = 0;
  private eventSource?: EventSource;
  private writeEndpoint?: string;
  private sequenceNumber = 0;
  
  constructor(config: BridgeV2Config) {
    super(config);
    this.sessionId = config.sessionId;
    this.oauthToken = config.oauthToken;
  }
  
  /**
   * Connect to bridge v2
 * 
   * Steps:
   * 1. Get fresh JWT via /bridge endpoint
   * 2. Open SSE connection for reads
   * 3. Initialize write endpoint
   */
  async connect(): Promise<void> {
    try {
      // Step 1: Get worker JWT
      await this.refreshWorkerJwt();
      
      // Step 2: Open SSE connection
      await this.openSSEConnection();
      
      // Step 3: Set up write endpoint
      this.writeEndpoint = `${this.config.apiBaseUrl}/v1/code/sessions/${this.sessionId}/messages`;
      
      this.onConnected();
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * Refresh worker JWT via /bridge endpoint
   * 
   * Each /bridge call bumps the epoch -- it IS the registration.
   * A new epoch tells the server this is the same worker with fresh credentials.
   */
  private async refreshWorkerJwt(): Promise<void> {
    const response = await fetch(
      `${this.config.apiBaseUrl}/v1/code/sessions/${this.sessionId}/bridge`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.oauthToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ client_capabilities: ['sse', 'http_post_writes'] }),
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to connect bridge: ${response.status} ${response.statusText}`);
    }
    
    const connection: BridgeV2Connection = await response.json();
    this.workerJwt = connection.workerJwt;
    this.workerEpoch = connection.workerEpoch;
  }
  
  /**
   * Open SSE connection for reads
   */
  private async openSSEConnection(): Promise<void> {
    const sseUrl = `${this.config.apiBaseUrl}/v1/code/sessions/${this.sessionId}/events`;
    
    this.eventSource = new EventSource(sseUrl, {
      // @ts-expect-error: custom headers not in standard type
      headers: {
        'Authorization': `Bearer ${this.workerJwt}`,
      },
    });
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('SSE connection timeout'));
      }, 30000);
      
      this.eventSource!.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };
      
      this.eventSource!.onerror = (error) => {
        clearTimeout(timeout);
        reject(new Error('SSE connection failed'));
      };
      
      this.eventSource!.onmessage = (event) => {
        this.handleSSEMessage(event);
      };
    });
  }
  
  /**
   * Handle SSE message
   */
  private handleSSEMessage(event: MessageEvent): void {
    const events = parseSSEEvent(event.data);
    
    for (const sseEvent of events) {
      const data = parseSSEData(sseEvent.data);
      
      if (this.isCCRMessage(data)) {
        this.receiveMessage(data as unknown as BridgeMessage);
      }
    }
  }
  
  /**
   * Type guard for CCR messages
   */
  private isCCRMessage(data: unknown): data is CCRMessage {
    return (
      typeof data === 'object' &&
      data !== null &&
      'type' in data &&
      typeof (data as CCRMessage).type === 'string'
    );
  }
  
  /**
   * Send message implementation (writes via HTTP POST)
   */
  protected async doSend(message: BridgeMessage): Promise<void> {
    if (!this.writeEndpoint || !this.workerJwt) {
      throw new Error('Not connected');
    }
    
    const ccrMessage: CCRMessage & { seq: number } = {
      ...(message as unknown as CCRMessage),
      seq: ++this.sequenceNumber,
    };
    
    const response = await fetch(this.writeEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.workerJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ccrMessage),
    });
    
    if (response.status === 401) {
      // Token expired -- refresh and retry once
      await this.refreshWorkerJwt();
      
      const retryResponse = await fetch(this.writeEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.workerJwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ccrMessage),
      });
      
      if (!retryResponse.ok) {
        throw new Error(`Failed to send after token refresh: ${retryResponse.status}`);
      }
    } else if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
    }
  }
  
  /**
   * Attempt reconnection
   * 
   * On 401, rebuild with fresh credentials from new /bridge call
   * while preserving sequence number cursor.
   */
  protected async attemptReconnect(): Promise<void> {
    try {
      // Preserve sequence number for continuity
      const savedSeq = this.sequenceNumber;
      
      // Get fresh credentials
      await this.refreshWorkerJwt();
      
      // Reconnect SSE
      await this.openSSEConnection();
      
      // Restore sequence number
      this.sequenceNumber = savedSeq;
      
      this.onConnected();
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  /**
   * Close the transport
   */
  async close(): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
    
    await super.close();
  }
}

/**
 * Create bridge v2 transport
 */
export function createBridgeV2Transport(config: {
  sessionId: string;
  oauthToken: string;
  apiBaseUrl: string;
  getAuthToken: () => Promise<string>;
}): BridgeV2Transport {
  return new BridgeV2Transport(config);
}
