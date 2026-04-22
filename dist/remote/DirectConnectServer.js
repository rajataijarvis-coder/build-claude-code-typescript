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
import { BoundedUUIDSet } from './BoundedUUIDSet.js';
/**
 * Direct Connect WebSocket server
 *
 * Implements cc:// protocol for local agent control.
 * Sessions persist metadata to disk for resume across restarts.
 */
export class DirectConnectServer {
    config;
    sessions = new Map();
    messageHandlers = new Set;
    dedupSet = new BoundedUUIDSet(1000);
    server;
    constructor(config) {
        this.config = config;
    }
    /**
     * Start the server
     */
    async start() {
        // @ts-ignore - Optional ws module
        const wsModule = await import('ws');
        const WebSocketServer = wsModule.WebSocketServer;
        const port = this.config.port ?? 0;
        const host = this.config.host ?? 'localhost';
        this.server = new WebSocketServer({ port, host });
        const server = this.server;
        server.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });
        // Get actual port (if ephemeral)
        const address = server.address();
        const actualPort = typeof address === 'object' ? address?.port : port;
        const url = `cc://${host}:${actualPort}`;
        console.log(`Direct Connect server listening on ${url}`);
        return { port: actualPort, url };
    }
    /**
     * Handle new WebSocket connection
     */
    handleConnection(ws, req) {
        const sessionId = crypto.randomUUID();
        const session = {
            id: sessionId,
            state: 'starting',
            metadata: {
                createdAt: Date.now(),
                lastActivity: Date.now(),
                workingDirectory: this.config.workingDirectory,
            },
            websocket: ws,
        };
        this.sessions.set(sessionId, session);
        // Set up message handling
        ws.on('message', (data) => {
            this.handleMessage(sessionId, data);
        });
        ws.on('close', () => {
            this.handleDisconnect(sessionId);
        });
        ws.on('error', (error) => {
            console.error(`Session ${sessionId} error:`, error);
        });
        // Send session created notification
        this.sendToSession(sessionId, {
            type: 'session',
            action: 'created',
            sessionId,
        });
        session.state = 'running';
    }
    /**
     * Handle incoming message
     */
    handleMessage(sessionId, data) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        session.metadata.lastActivity = Date.now();
        try {
            const message = JSON.parse(data.toString());
            // Deduplicate by UUID
            if ('uuid' in message && message.uuid) {
                if (this.dedupSet.has(message.uuid)) {
                    return; // Duplicate
                }
                this.dedupSet.add(message.uuid);
            }
            // Notify handlers
            for (const handler of this.messageHandlers) {
                try {
                    handler(sessionId, message);
                }
                catch (error) {
                    console.error('Message handler error:', error);
                }
            }
        }
        catch (error) {
            console.error('Failed to parse message:', error);
        }
    }
    /**
     * Handle session disconnect
     */
    handleDisconnect(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        session.state = 'detached';
        session.websocket = undefined;
        // Persist session for potential resume
        this.persistSession(session);
    }
    /**
     * Send message to a session
     */
    sendToSession(sessionId, message) {
        const session = this.sessions.get(sessionId);
        if (!session?.websocket)
            return false;
        try {
            const ws = session.websocket;
            ws.send(JSON.stringify(message));
            session.metadata.lastActivity = Date.now();
            return true;
        }
        catch (error) {
            console.error(`Failed to send to session ${sessionId}:`, error);
            return false;
        }
    }
    /**
     * Broadcast to all running sessions
     */
    broadcast(message) {
        for (const [sessionId, session] of this.sessions) {
            if (session.state === 'running') {
                this.sendToSession(sessionId, message);
            }
        }
    }
    /**
     * Add message handler
     */
    onMessage(handler) {
        this.messageHandlers.add(handler);
        return () => this.messageHandlers.delete(handler);
    }
    /**
     * Get session by ID
     */
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    /**
     * Get all sessions
     */
    getAllSessions() {
        return Array.from(this.sessions.values());
    }
    /**
     * Stop a session
     */
    async stopSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        session.state = 'stopping';
        // Send close notification
        this.sendToSession(sessionId, {
            type: 'session',
            action: 'closed',
            sessionId,
        });
        // Close WebSocket
        if (session.websocket) {
            const ws = session.websocket;
            ws.close();
        }
        session.state = 'stopped';
        this.sessions.delete(sessionId);
    }
    /**
     * Stop the server
     */
    async stop() {
        // Stop all sessions
        for (const sessionId of this.sessions.keys()) {
            await this.stopSession(sessionId);
        }
        // Close server
        return new Promise((resolve) => {
            if (this.server) {
                const srv = this.server;
                srv.close(resolve);
            }
            else {
                resolve();
            }
        });
    }
    /**
     * Persist session metadata to disk
     */
    persistSession(session) {
        if (!this.config.sessionFilePath)
            return;
        try {
            const existing = this.loadPersistedSessions();
            existing[session.id] = session.metadata;
            // Write atomically
            const tmpFile = `${this.config.sessionFilePath}.tmp`;
            require('fs').writeFileSync(tmpFile, JSON.stringify(existing, null, 2));
            require('fs').renameSync(tmpFile, this.config.sessionFilePath);
        }
        catch (error) {
            console.error('Failed to persist session:', error);
        }
    }
    /**
     * Load persisted sessions
     */
    loadPersistedSessions() {
        if (!this.config.sessionFilePath)
            return {};
        try {
            const data = require('fs').readFileSync(this.config.sessionFilePath, 'utf-8');
            return JSON.parse(data);
        }
        catch {
            return {};
        }
    }
}
/**
 * Parse cc:// URL
 */
export function parseCCURL(url) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'cc:') {
            return null;
        }
        return {
            protocol: 'cc:',
            hostname: parsed.hostname,
            port: parsed.port ? parseInt(parsed.port, 10) : undefined,
            sessionId: parsed.searchParams.get('session') ?? undefined,
            token: parsed.searchParams.get('token') ?? undefined,
        };
    }
    catch {
        return null;
    }
}
/**
 * Create Direct Connect server
 */
export function createDirectConnectServer(config) {
    return new DirectConnectServer(config);
}
//# sourceMappingURL=DirectConnectServer.js.map