/**
 * Bridge v2 Transport
 *
 * Direct sessions with SSE for reads, CCRClient for writes.
 * No polling, no Environments API -- just create session, connect bridge, open transport.
 */
import { BridgeTransportConfig, BridgeMessage } from './types.js';
import { BridgeTransport } from './BridgeTransport.js';
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
export declare class BridgeV2Transport extends BridgeTransport {
    private sessionId;
    private oauthToken;
    private workerJwt?;
    private workerEpoch;
    private eventSource?;
    private writeEndpoint?;
    private sequenceNumber;
    constructor(config: BridgeV2Config);
    /**
     * Connect to bridge v2
   *
     * Steps:
     * 1. Get fresh JWT via /bridge endpoint
     * 2. Open SSE connection for reads
     * 3. Initialize write endpoint
     */
    connect(): Promise<void>;
    /**
     * Refresh worker JWT via /bridge endpoint
     *
     * Each /bridge call bumps the epoch -- it IS the registration.
     * A new epoch tells the server this is the same worker with fresh credentials.
     */
    private refreshWorkerJwt;
    /**
     * Open SSE connection for reads
     */
    private openSSEConnection;
    /**
     * Handle SSE message
     */
    private handleSSEMessage;
    /**
     * Type guard for CCR messages
     */
    private isCCRMessage;
    /**
     * Send message implementation (writes via HTTP POST)
     */
    protected doSend(message: BridgeMessage): Promise<void>;
    /**
     * Attempt reconnection
     *
     * On 401, rebuild with fresh credentials from new /bridge call
     * while preserving sequence number cursor.
     */
    protected attemptReconnect(): Promise<void>;
    /**
     * Close the transport
     */
    close(): Promise<void>;
}
/**
 * Create bridge v2 transport
 */
export declare function createBridgeV2Transport(config: {
    sessionId: string;
    oauthToken: string;
    apiBaseUrl: string;
    getAuthToken: () => Promise<string>;
}): BridgeV2Transport;
export {};
//# sourceMappingURL=BridgeV2Transport.d.ts.map