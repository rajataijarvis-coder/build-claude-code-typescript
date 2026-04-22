/**
 * Remote Control Types
 *
 * Type definitions for bridge protocols, Direct Connect,
 * and upstream proxy systems.
 */
/** Bridge protocol version */
export type BridgeVersion = 'v1' | 'v2';
/** Bridge connection states */
export type BridgeState = 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'closed';
/** Bridge transport interface -- unifies v1 and v2 */
export interface BridgeTransport {
    /** Send a message to the bridge */
    send(message: BridgeMessage): Promise<void>;
    /** Close the transport */
    close(): Promise<void>;
    /** Current state */
    state: BridgeState;
    /** Called when message received */
    onMessage?: (message: BridgeMessage) => void;
    /** Called when state changes */
    onStateChange?: (state: BridgeState) => void;
}
/** Bridge message types */
export type BridgeMessage = UserMessage | ControlRequest | ControlResponse | SessionMessage | HealthCheck;
/** User message from web interface */
export interface UserMessage {
    type: 'user_message';
    uuid: string;
    content: string;
    timestamp: number;
}
/** Control request (permission prompt) */
export interface ControlRequest {
    type: 'control_request';
    uuid: string;
    requestType: string;
    data: unknown;
}
/** Control response (permission decision) */
export interface ControlResponse {
    type: 'control_response';
    uuid: string;
    approved: boolean;
    reason?: string;
}
/** Session-level message */
export interface SessionMessage {
    type: 'session';
    action: 'created' | 'closed' | 'error';
    sessionId: string;
    data?: unknown;
}
/** Health check ping/pong */
export interface HealthCheck {
    type: 'healthcheck';
    timestamp: number;
}
/** v1 bridge registration */
export interface BridgeV1Registration {
    environmentId: string;
    machineId: string;
    capabilities: string[];
    oauthToken: string;
}
/** v1 work item from polling */
export interface BridgeV1WorkItem {
    type: 'session' | 'healthcheck';
    session?: BridgeV1Session;
}
/** v1 session data */
export interface BridgeV1Session {
    id: string;
    secret: {
        sessionToken: string;
        apiBaseUrl: string;
        mcpConfigs: MCPServerConfig[];
        env: Record<string, string>;
    };
}
/** MCP server config (subset) */
export interface MCPServerConfig {
    name: string;
    command?: string;
    url?: string;
}
/** v2 session creation response */
export interface BridgeV2Session {
    id: string;
    workerEpoch: number;
}
/** v2 bridge connection response */
export interface BridgeV2Connection {
    workerJwt: string;
    apiBaseUrl: string;
    workerEpoch: number;
}
/** CCR (Claude Code Remote) message */
export interface CCRMessage {
    type: string;
    uuid?: string;
    payload?: unknown;
}
/** SSE (Server-Sent Events) event */
export interface SSEEvent {
    id?: string;
    event?: string;
    data: string;
}
/** Direct Connect session states */
export type DirectSessionState = 'starting' | 'running' | 'detached' | 'stopping' | 'stopped';
/** Direct Connect session */
export interface DirectSession {
    id: string;
    state: DirectSessionState;
    metadata: SessionMetadata;
    websocket?: WebSocket;
}
/** Session metadata for persistence */
export interface SessionMetadata {
    createdAt: number;
    lastActivity: number;
    workingDirectory: string;
}
/** cc:// URL parsed structure */
export interface CCURL {
    protocol: 'cc:';
    hostname: string;
    port?: number;
    sessionId?: string;
    token?: string;
}
/** Upstream proxy configuration */
export interface UpstreamProxyConfig {
    sessionTokenPath: string;
    caCertPath: string;
    upstreamUrl: string;
}
/** Upstream proxy state */
export interface UpstreamProxyState {
    enabled: boolean;
    localPort: number;
    connected: boolean;
    lastError?: string;
}
/** Protobuf chunk for tunnel (hand-encoded) */
export interface ProxyChunk {
    data: Uint8Array;
}
/** Reconfiguration strategy for different failure types */
export interface ReconnectionStrategy {
    /** Max retry attempts */
    maxRetries: number;
    /** Initial delay in ms */
    initialDelay: number;
    /** Max delay in ms */
    maxDelay: number;
    /** Backoff multiplier */
    multiplier: number;
    /** Strategy type */
    type: 'exponential' | 'linear' | 'none';
}
/** WebSocket close codes */
export declare enum WebSocketCloseCode {
    NORMAL = 1000,
    GOING_AWAY = 1001,
    PROTOCOL_ERROR = 1002,
    UNSUPPORTED_DATA = 1003,
    NO_STATUS = 1005,
    ABNORMAL = 1006,
    INVALID_FRAME = 1007,
    POLICY_VIOLATION = 1008,
    MESSAGE_TOO_BIG = 1009,
    EXTENSION_REQUIRED = 1010,
    INTERNAL_ERROR = 1011,
    SERVICE_RESTART = 1012,
    TRY_AGAIN_LATER = 1013,
    BAD_GATEWAY = 1014,
    TLS_HANDSHAKE = 1015,
    UNAUTHORIZED = 4003,
    SESSION_NOT_FOUND = 4001,
    RATE_LIMITED = 4004
}
/** Get reconnection strategy for close code */
export declare function getReconnectionStrategy(code: number, attemptCount: number): ReconnectionStrategy;
/** Bounded UUID set for deduplication */
export interface BoundedUUIDSetOptions {
    capacity: number;
}
/** Flush gate for message ordering */
export interface FlushGateState {
    isFlushing: boolean;
    queuedMessages: BridgeMessage[];
}
/** Message handler function type */
export type MessageHandler = (message: BridgeMessage) => void | Promise<void>;
/** Type guard for bridge messages */
export declare function isBridgeMessage(obj: unknown): obj is BridgeMessage;
/** Type guard for control messages */
export declare function isControlMessage(obj: unknown): obj is ControlRequest | ControlResponse;
//# sourceMappingURL=types.d.ts.map