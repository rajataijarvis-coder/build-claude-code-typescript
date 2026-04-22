/**
 * Remote Control Integration Example
 *
 * Shows how to integrate bridge, Direct Connect, and upstream proxy
 * into the main application.
 */
import { createBridgeV2Transport, createDirectConnectServer, createUpstreamProxy, } from './index.js';
/**
 * Remote controller -- manages all remote control transports
 */
export class RemoteController {
    config;
    bridge;
    directConnect;
    upstreamProxy;
    constructor(config) {
        this.config = config;
    }
    /**
     * Initialize all enabled remote control systems
     */
    async initialize() {
        // Initialize upstream proxy first (if in container)
        if (this.config.upstreamProxyEnabled) {
            this.upstreamProxy = createUpstreamProxy({
                sessionTokenPath: this.config.upstreamProxyTokenPath ?? '/run/ccr/session_token',
                caCertPath: '/tmp/upstream-ca.crt',
                upstreamUrl: 'wss://upstream.anthropic.com/v1/tunnel',
            });
            await this.upstreamProxy.initialize();
        }
        // Initialize bridge v2
        if (this.config.bridgeEnabled && this.config.bridgeSessionId) {
            this.bridge = createBridgeV2Transport({
                sessionId: this.config.bridgeSessionId,
                oauthToken: this.config.bridgeOAuthToken ?? '',
                apiBaseUrl: this.config.bridgeApiBaseUrl ?? 'https://api.anthropic.com',
                getAuthToken: async () => this.config.bridgeOAuthToken ?? '',
            });
            await this.bridge.connect();
            // Set up message handling
            this.bridge.onMessage = (message) => {
                console.log('Bridge message:', message);
            };
        }
        // Initialize Direct Connect
        if (this.config.directConnectEnabled) {
            this.directConnect = createDirectConnectServer({
                port: this.config.directConnectPort,
                workingDirectory: process.cwd(),
                sessionFilePath: `${process.env.HOME}/.claude/server-sessions.json`,
            });
            const { url } = await this.directConnect.start();
            console.log(`Direct Connect available at ${url}`);
            // Set up message handling
            this.directConnect.onMessage((sessionId, message) => {
                console.log(`Session ${sessionId}:`, message);
            });
        }
    }
    /**
     * Send message via bridge
     */
    async sendViaBridge(message) {
        if (!this.bridge) {
            throw new Error('Bridge not initialized');
        }
        await this.bridge.send({
            type: 'user_message',
            uuid: message.uuid,
            content: message.content,
            timestamp: Date.now(),
        });
    }
    /**
     * Get Direct Connect sessions
     */
    getDirectConnectSessions() {
        return this.directConnect?.getAllSessions() ?? [];
    }
    /**
     * Get upstream proxy state
     */
    getUpstreamProxyState() {
        return this.upstreamProxy?.getState();
    }
    /**
     * Stop all remote control systems
     */
    async stop() {
        await this.bridge?.close();
        await this.directConnect?.stop();
        await this.upstreamProxy?.stop();
    }
}
/**
 * Create remote controller
 */
export function createRemoteController(config) {
    return new RemoteController(config);
}
//# sourceMappingURL=example.js.map