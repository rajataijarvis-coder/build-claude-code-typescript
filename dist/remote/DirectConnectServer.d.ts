/**
 * Direct Connect Server
 *
 * Local WebSocket server that allows remote clients to connect directly.
 * No cloud intermediary, no OAuth tokens -- just local control.
 *
 * Session states: starting → running → (detached) → stopping → stopped
 *
 * Note: Requires 'ws' package to be installed: npm install ws
 * @ts-nocheck -- WebSocket types require @types/ws
 */
import { DirectSession, CCURL, BridgeMessage } from './types.js';
export interface DirectConnectConfig {
    /** Port to listen on (0 = ephemeral) */
    port?: number;
    /** Host to bind to */
    host?: string;
    /** Working directory for sessions */
    workingDirectory: string;
    /** Path to session persistence file */
    sessionFilePath?: string;
}
/**
 * Direct Connect WebSocket server
 *
 * Implements cc:// protocol for local agent control.
 * Sessions persist metadata to disk for resume across restarts.
 */
export declare class DirectConnectServer {
    private config;
    private sessions;
    private messageHandlers;
    private dedupSet;
    private server?;
    constructor(config: DirectConnectConfig);
    /**
     * Start the server
     */
    start(): Promise<{
        port: number;
        url: string;
    }>;
    /**
     * Handle new WebSocket connection
     */
    private handleConnection;
    /**
     * Handle incoming message
     */
    private handleMessage;
    /**
     * Handle session disconnect
     */
    private handleDisconnect;
    /**
     * Send message to a session
     */
    sendToSession(sessionId: string, message: BridgeMessage): boolean;
    /**
     * Broadcast to all running sessions
     */
    broadcast(message: BridgeMessage): void;
    /**
     * Add message handler
     */
    onMessage(handler: (sessionId: string, message: BridgeMessage) => void): () => void;
    /**
     * Get session by ID
     */
    getSession(sessionId: string): DirectSession | undefined;
    /**
     * Get all sessions
     */
    getAllSessions(): DirectSession[];
    /**
     * Stop a session
     */
    stopSession(sessionId: string): Promise<void>;
    /**
     * Stop the server
     */
    stop(): Promise<void>;
    /**
     * Persist session metadata to disk
     */
    private persistSession;
    /**
     * Load persisted sessions
     */
    private loadPersistedSessions;
}
/**
 * Parse cc:// URL
 */
export declare function parseCCURL(url: string): CCURL | null;
/**
 * Create Direct Connect server
 */
export declare function createDirectConnectServer(config: DirectConnectConfig): DirectConnectServer;
//# sourceMappingURL=DirectConnectServer.d.ts.map