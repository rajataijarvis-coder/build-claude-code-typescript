/**
 * Upstream Proxy
 *
 * Runs inside CCR containers to inject organization credentials
 * into outbound HTTPS traffic. Carefully ordered setup sequence
 * protects against credential leakage.
 */
import { UpstreamProxyState } from './types.js';
export interface UpstreamProxyOptions {
    /** Path to session token file */
    sessionTokenPath: string;
    /** Path to write CA certificate */
    caCertPath: string;
    /** Upstream WebSocket URL */
    upstreamUrl: string;
    /** Local relay port (0 = ephemeral) */
    localPort?: number;
}
/**
 * Upstream proxy for credential injection in containers
 *
 * Setup sequence (order matters for security):
 * 1. Read session token from file
 * 2. Set prctl(PR_SET_DUMPABLE, 0) via Bun FFI
 * 3. Download upstream proxy CA certificate
 * 4. Start local CONNECT-to-WebSocket relay
 * 5. Unlink token file (token now heap-only)
 * 6. Export environment variables
 *
 * Each step fails open -- errors disable proxy rather than kill session.
 */
export declare class UpstreamProxy {
    private options;
    private state;
    private websocket?;
    private token?;
    private relayServer?;
    constructor(options: UpstreamProxyOptions);
    /**
     * Initialize the upstream proxy
     *
     * Carefully ordered for security:
     * - Token is read from file, then file is deleted
     * - ptrace is disabled before token touches heap
     * - Certificate is downloaded and stored
     * - Relay starts on ephemeral port
     * - Environment variables exported for child processes
     */
    initialize(): Promise<boolean>;
    /**
     * Read session token from file
     */
    private readSessionToken;
    /**
     * Disable ptrace to prevent memory inspection
     *
     * Uses Bun FFI to call prctl(PR_SET_DUMPABLE, 0).
     * Without this, a same-UID process could use ptrace to read
     * the session token from heap memory.
     */
    private disablePtrace;
    /**
     * Download upstream proxy CA certificate
     */
    private downloadCACertificate;
    /**
     * Get system CA bundle
     */
    private getSystemCABundle;
    /**
     * Start CONNECT-to-WebSocket relay
     *
     * Local processes connect via HTTP CONNECT to this relay,
     * which tunnels through WebSocket to upstream infrastructure.
     */
    private startRelay;
    /**
     * Handle relay connection
     */
    private handleRelayConnection;
    /**
     * Connect to upstream WebSocket
     */
    private connectUpstream;
    /**
     * Handle data from upstream
     */
    private handleUpstreamData;
    /**
     * Delete token file (token now heap-only)
     */
    private deleteTokenFile;
    /**
     * Export environment variables for child processes
     */
    private exportEnvironmentVariables;
    /**
     * Get current proxy state
     */
    getState(): UpstreamProxyState;
    /**
     * Stop the proxy
     */
    stop(): Promise<void>;
}
/**
 * Encode proxy chunk as protobuf (hand-encoded)
 *
 * Schema: message UpstreamProxyChunk { bytes data = 1; }
 * Field 1, wire type 2 (length-delimited) = 0x0a
 */
export declare function encodeProxyChunk(data: Uint8Array): Uint8Array;
/**
 * Decode proxy chunk from protobuf
 */
export declare function decodeProxyChunk(buffer: Uint8Array): Uint8Array;
/**
 * Create upstream proxy
 */
export declare function createUpstreamProxy(options: UpstreamProxyOptions): UpstreamProxy;
//# sourceMappingURL=UpstreamProxy.d.ts.map