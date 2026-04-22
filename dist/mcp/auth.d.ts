/**
 * OAuth Authentication for MCP
 *
 * Implements RFC 9728 (OAuth Protected Resource Metadata),
 * RFC 8414 (OAuth Authorization Server Metadata), and PKCE.
 */
import { OAuthConfig, OAuthServerMetadata, OAuthTokens } from './types.js';
/**
 * Discover OAuth authorization server metadata
 *
 * Follows the discovery chain:
 * 1. RFC 9728 probe (GET /.well-known/oauth-protected-resource)
 * 2. Extract authorization_servers[0]
 * 3. RFC 8414 discovery against auth server URL
 * 4. Fallback: RFC 8414 against MCP server URL
 * 5. Escape hatch: direct metadata URL from config
 */
export declare function discoverOAuthMetadata(serverUrl: string, config?: OAuthConfig): Promise<OAuthServerMetadata>;
/**
 * Generate PKCE parameters
 */
export declare function generatePKCE(): {
    codeVerifier: string;
    codeChallenge: string;
    codeChallengeMethod: string;
};
/**
 * Build authorization URL for OAuth flow
 */
export declare function buildAuthorizationUrl(metadata: OAuthServerMetadata, clientId: string, redirectUri: string, pkce: {
    codeChallenge: string;
    codeChallengeMethod: string;
}, scopes?: string[]): string;
/**
 * Exchange authorization code for tokens
 */
export declare function exchangeCodeForTokens(metadata: OAuthServerMetadata, code: string, codeVerifier: string, clientId: string, redirectUri: string): Promise<OAuthTokens>;
/**
 * Refresh access token
 */
export declare function refreshAccessToken(metadata: OAuthServerMetadata, refreshToken: string, clientId: string): Promise<OAuthTokens>;
/**
 * Normalize OAuth error body -- handles spec violations
 *
 * Some servers (e.g., Slack) return HTTP 200 with errors in the body.
 * This function normalizes those to proper error format.
 */
export declare function normalizeOAuthErrorBody(status: number, body: unknown): {
    error: string;
    error_description?: string;
};
export declare class OAuthDiscoveryError extends Error {
    constructor(message: string);
}
export declare class OAuthError extends Error {
    code: string;
    description?: string;
    constructor(code: string, description?: string);
}
//# sourceMappingURL=auth.d.ts.map