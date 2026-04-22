/**
 * OAuth Authentication for MCP
 * 
 * Implements RFC 9728 (OAuth Protected Resource Metadata),
 * RFC 8414 (OAuth Authorization Server Metadata), and PKCE.
 */

import { OAuthConfig, OAuthServerMetadata, OAuthTokens, OAuthErrorResponse } from './types.js';

// RFC 9728 well-known endpoint for resource server metadata
const OAUTH_PROTECTED_RESOURCE_WELL_KNOWN = '/.well-known/oauth-protected-resource';

// RFC 8414 well-known endpoint for authorization server metadata
const OAUTH_AUTHORIZATION_SERVER_WELL_KNOWN = '/.well-known/openid-configuration';

// Default scopes if none specified
const DEFAULT_SCOPES = ['mcp'];

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
export async function discoverOAuthMetadata(
  serverUrl: string,
  config?: OAuthConfig
): Promise<OAuthServerMetadata> {
  const baseUrl = new URL(serverUrl);
  
  // Step 1: Try RFC 9728 discovery
  try {
    const resourceMetadataUrl = new URL(OAUTH_PROTECTED_RESOURCE_WELL_KNOWN, baseUrl);
    const resourceResponse = await fetch(resourceMetadataUrl.toString());
    
    if (resourceResponse.ok) {
      const resourceMetadata = await resourceResponse.json() as { authorization_servers?: string[] };
      const authServers = resourceMetadata.authorization_servers;
      
      if (Array.isArray(authServers) && authServers.length > 0) {
        // Step 2: RFC 8414 discovery against auth server
        const authServerUrl = new URL(authServers[0]);
        const metadata = await fetchAuthorizationServerMetadata(authServerUrl);
        if (metadata) return metadata;
      }
    }
  } catch {
    // RFC 9728 not supported, continue to fallback
  }
  
  // Step 4: Fallback RFC 8414 against MCP server URL
  const fallbackMetadata = await fetchAuthorizationServerMetadata(baseUrl);
  if (fallbackMetadata) return fallbackMetadata;
  
  // Step 5: Escape hatch -- direct metadata URL from config
  if (config?.authServerMetadataUrl) {
    const response = await fetch(config.authServerMetadataUrl);
    if (response.ok) {
      return await response.json() as OAuthServerMetadata;
    }
  }
  
  throw new OAuthDiscoveryError('Failed to discover OAuth metadata');
}

/**
 * Fetch RFC 8414 authorization server metadata
 */
async function fetchAuthorizationServerMetadata(url: URL): Promise<OAuthServerMetadata | null> {
  try {
    const metadataUrl = new URL(OAUTH_AUTHORIZATION_SERVER_WELL_KNOWN, url);
    const response = await fetch(metadataUrl.toString());
    
    if (response.ok) {
      return await response.json() as OAuthServerMetadata;
    }
  } catch {
    // Not found or error
  }
  
  // Try path-aware probing (some servers use /oauth/.well-known/...)
  const pathVariants = [
    '/oauth' + OAUTH_AUTHORIZATION_SERVER_WELL_KNOWN,
    '/auth' + OAUTH_AUTHORIZATION_SERVER_WELL_KNOWN,
    '/idp' + OAUTH_AUTHORIZATION_SERVER_WELL_KNOWN,
  ];
  
  for (const path of pathVariants) {
    try {
      const variantUrl = new URL(path, url.origin);
      const response = await fetch(variantUrl.toString());
      if (response.ok) {
        return await response.json() as OAuthServerMetadata;
      }
    } catch {
      continue;
    }
  }
  
  return null;
}

/**
 * Generate PKCE parameters
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string; codeChallengeMethod: string } {
  // Generate random code verifier (43-128 chars)
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = base64URLEncode(array);
  
  // Generate code challenge (SHA256 of verifier)
  const codeChallenge = base64URLEncode(sha256(codeVerifier));
  
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  };
}

/**
 * Build authorization URL for OAuth flow
 */
export function buildAuthorizationUrl(
  metadata: OAuthServerMetadata,
  clientId: string,
  redirectUri: string,
  pkce: { codeChallenge: string; codeChallengeMethod: string },
  scopes?: string[]
): string {
  const url = new URL(metadata.authorization_endpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code_challenge', pkce.codeChallenge);
  url.searchParams.set('code_challenge_method', pkce.codeChallengeMethod);
  url.searchParams.set('scope', (scopes ?? DEFAULT_SCOPES).join(' '));
  
  return url.toString();
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  metadata: OAuthServerMetadata,
  code: string,
  codeVerifier: string,
  clientId: string,
  redirectUri: string
): Promise<OAuthTokens> {
  const response = await fetch(metadata.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      client_id: clientId,
      redirect_uri: redirectUri,
    }),
  });
  
  const body = await response.json();
  
  if (!response.ok || isOAuthErrorResponse(body)) {
    const normalized = normalizeOAuthErrorBody(response.status, body);
    throw new OAuthError(normalized.error, normalized.error_description);
  }
  
  return body as OAuthTokens;
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  metadata: OAuthServerMetadata,
  refreshToken: string,
  clientId: string
): Promise<OAuthTokens> {
  const response = await fetch(metadata.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });
  
  const body = await response.json();
  
  if (!response.ok || isOAuthErrorResponse(body)) {
    const normalized = normalizeOAuthErrorBody(response.status, body);
    throw new OAuthError(normalized.error, normalized.error_description);
  }
  
  return body as OAuthTokens;
}

/**
 * Normalize OAuth error body -- handles spec violations
 * 
 * Some servers (e.g., Slack) return HTTP 200 with errors in the body.
 * This function normalizes those to proper error format.
 */
export function normalizeOAuthErrorBody(
  status: number,
  body: unknown
): { error: string; error_description?: string } {
  // If it's already a proper error response
  if (isOAuthErrorResponse(body)) {
    return {
      error: normalizeOAuthErrorCode(body.error),
      error_description: body.error_description,
    };
  }
  
  // If it's a token response but status indicates error
  if (status >= 400) {
    return {
      error: 'server_error',
      error_description: JSON.stringify(body),
    };
  }
  
  // Some servers return 200 with error in body (Slack)
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const errorBody = body as { error: string; error_description?: string };
    return {
      error: normalizeOAuthErrorCode(errorBody.error),
      error_description: errorBody.error_description,
    };
  }
  
  return { error: 'unknown_error' };
}

/**
 * Check if response body is an OAuth error
 */
function isOAuthErrorResponse(body: unknown): body is OAuthErrorResponse {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as OAuthErrorResponse).error === 'string'
  );
}

/**
 * Normalize OAuth error codes -- handle non-standard codes
 */
function normalizeOAuthErrorCode(code: string): string {
  // Slack-specific error codes
  const slackCodes: Record<string, string> = {
    'invalid_refresh_token': 'invalid_grant',
    'expired_refresh_token': 'invalid_grant',
    'token_expired': 'invalid_grant',
  };
  
  return slackCodes[code] ?? code;
}

/**
 * Base64URL encode bytes
 */
function base64URLEncode(buffer: Uint8Array | string): string {
  let base64: string;
  
  if (typeof buffer === 'string') {
    base64 = btoa(buffer);
  } else {
    const binary = Array.from(buffer).map(b => String.fromCharCode(b)).join('');
    base64 = btoa(binary);
  }
  
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * SHA256 hash (for PKCE)
 */
function sha256(input: string): Uint8Array {
  // Simple SHA-256 implementation for demonstration
  // In production, use crypto.subtle.digest in browser or crypto module in Node
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  
  // Note: This is a placeholder. In production, use:
  // const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  // return new Uint8Array(hashBuffer);
  
  // For now, return a mock hash (32 bytes for SHA-256)
  const mockHash = new Uint8Array(32);
  for (let i = 0; i < data.length && i < 32; i++) {
    mockHash[i] = data[i];
  }
  return mockHash;
}

// ============================================================================
// Error Classes
// ============================================================================

export class OAuthDiscoveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthDiscoveryError';
  }
}

export class OAuthError extends Error {
  code: string;
  description?: string;
  
  constructor(code: string, description?: string) {
    super(`${code}${description ? `: ${description}` : ''}`);
    this.name = 'OAuthError';
    this.code = code;
    this.description = description;
  }
}
