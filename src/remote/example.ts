/**
 * Remote Control Integration Example
 * 
 * Shows how to integrate bridge, Direct Connect, and upstream proxy
 * into the main application.
 */

import {
  BridgeV2Transport,
  DirectConnectServer,
  UpstreamProxy,
  createBridgeV2Transport,
  createDirectConnectServer,
  createUpstreamProxy,
} from './index.js';

/**
 * Configuration for remote control
 */
export interface RemoteControlConfig {
  /** Enable bridge v2 */
  bridgeEnabled?: boolean;
  bridgeSessionId?: string;
  bridgeOAuthToken?: string;
  bridgeApiBaseUrl?: string;
  
  /** Enable Direct Connect */
  directConnectEnabled?: boolean;
  directConnectPort?: number;
  
  /** Enable upstream proxy (for CCR containers) */
  upstreamProxyEnabled?: boolean;
  upstreamProxyTokenPath?: string;
}

/**
 * Remote controller -- manages all remote control transports
 */
export class RemoteController {
  private bridge?: BridgeV2Transport;
  private directConnect?: DirectConnectServer;
  private upstreamProxy?: UpstreamProxy;
  
  constructor(private config: RemoteControlConfig) {}
  
  /**
   * Initialize all enabled remote control systems
   */
  async initialize(): Promise<void> {
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
  async sendViaBridge(message: { type: string; uuid: string; content: string }): Promise<void> {
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
  async stop(): Promise<void> {
    await this.bridge?.close();
    await this.directConnect?.stop();
    await this.upstreamProxy?.stop();
  }
}

/**
 * Create remote controller
 */
export function createRemoteController(config: RemoteControlConfig): RemoteController {
  return new RemoteController(config);
}
