/**
 * Remote Control Integration Example
 *
 * Shows how to integrate bridge, Direct Connect, and upstream proxy
 * into the main application.
 */
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
export declare class RemoteController {
    private config;
    private bridge?;
    private directConnect?;
    private upstreamProxy?;
    constructor(config: RemoteControlConfig);
    /**
     * Initialize all enabled remote control systems
     */
    initialize(): Promise<void>;
    /**
     * Send message via bridge
     */
    sendViaBridge(message: {
        type: string;
        uuid: string;
        content: string;
    }): Promise<void>;
    /**
     * Get Direct Connect sessions
     */
    getDirectConnectSessions(): import("./types.js").DirectSession[];
    /**
     * Get upstream proxy state
     */
    getUpstreamProxyState(): import("./types.js").UpstreamProxyState | undefined;
    /**
     * Stop all remote control systems
     */
    stop(): Promise<void>;
}
/**
 * Create remote controller
 */
export declare function createRemoteController(config: RemoteControlConfig): RemoteController;
//# sourceMappingURL=example.d.ts.map