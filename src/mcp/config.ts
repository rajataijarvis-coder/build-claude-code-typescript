/**
 * MCP Configuration Loading
 * 
 * Loads MCP server configurations from multiple scopes:
 * - local: .mcp.json in working directory
 * - user: ~/.claude.json
 * - project: Project-level config
 * - enterprise: Managed enterprise config
 * - managed: Plugin-provided servers
 * - claudeai: Claude.ai web interface
 * - dynamic: Runtime injection (SDK)
 */

import { MCPServerConfig, TransportConfig } from './types.js';
import { getMCPServerSignature } from './wrapper.js';

/** Configuration scopes in priority order */
export type ConfigScope = 
  | 'local'
  | 'user'
  | 'project'
  | 'enterprise'
  | 'managed'
  | 'claudeai'
  | 'dynamic';

interface ConfigEntry {
  scope: ConfigScope;
  config: MCPServerConfig;
}

/**
 * Load MCP configurations from all scopes
 */
export async function loadMCPConfigs(): Promise<MCPServerConfig[]> {
  const entries: ConfigEntry[] = [];
  
  // Load from each scope
  const scopeLoaders: Record<ConfigScope, () => Promise<MCPServerConfig[]>> = {
    local: loadLocalConfig,
    user: loadUserConfig,
    project: loadProjectConfig,
    enterprise: loadEnterpriseConfig,
    managed: loadManagedConfig,
    claudeai: loadClaudeAIConfig,
    dynamic: loadDynamicConfig,
  };
  
  for (const [scope, loader] of Object.entries(scopeLoaders)) {
    try {
      const configs = await loader();
      for (const config of configs) {
        entries.push({ scope: scope as ConfigScope, config });
      }
    } catch (error) {
      // Scope might not exist -- that's ok
      console.debug(`Failed to load ${scope} config:`, error);
    }
  }
  
  // Deduplicate by signature (content-based, not name-based)
  const seenSignatures = new Set<string>();
  const deduplicated: MCPServerConfig[] = [];
  
  for (const entry of entries) {
    const signature = getMCPServerSignature(entry.config);
    
    // Plugin-provided servers whose signature matches a manual config are suppressed
    if (entry.scope === 'managed' && seenSignatures.has(signature)) {
      continue;
    }
    
    seenSignatures.add(signature);
    deduplicated.push(entry.config);
  }
  
  return deduplicated;
}

/**
 * Load local config from .mcp.json in working directory
 */
async function loadLocalConfig(): Promise<MCPServerConfig[]> {
  // In a real implementation, read from filesystem
  // For now, return empty
  return [];
}

/**
 * Load user config from ~/.claude.json
 */
async function loadUserConfig(): Promise<MCPServerConfig[]> {
  // In a real implementation, read from home directory
  return [];
}

/**
 * Load project-level config
 */
async function loadProjectConfig(): Promise<MCPServerConfig[]> {
  // In a real implementation, read from project root
  return [];
}

/**
 * Load enterprise-managed config
 */
async function loadEnterpriseConfig(): Promise<MCPServerConfig[]> {
  // In a real implementation, fetch from enterprise endpoint
  return [];
}

/**
 * Load plugin-provided server configs
 */
async function loadManagedConfig(): Promise<MCPServerConfig[]> {
  // In a real implementation, get from plugin system
  return [];
}

/**
 * Load Claude.ai connector configs
 */
async function loadClaudeAIConfig(): Promise<MCPServerConfig[]> {
  // In a real implementation, fetch from Claude.ai
  return [];
}

/**
 * Load dynamic/SDK configs
 */
async function loadDynamicConfig(): Promise<MCPServerConfig[]> {
  // In a real implementation, get from runtime
  return [];
}

/**
 * Parse MCP server config from JSON
 */
export function parseMCPServerConfig(name: string, json: unknown): MCPServerConfig {
  if (typeof json !== 'object' || json === null) {
    throw new Error(`Invalid config for ${name}: expected object`);
  }
  
  const obj = json as Record<string, unknown>;
  
  // Parse transport
  const transport = parseTransportConfig(obj);
  
  return {
    name,
    transport,
    auth: obj.auth as { clientId?: string; scopes?: string[] } | undefined,
  };
}

/**
 * Parse transport configuration
 */
function parseTransportConfig(obj: Record<string, unknown>): TransportConfig {
  // Default to stdio if no type specified
  const type = (obj.type as string) ?? 'stdio';
  
  switch (type) {
    case 'stdio':
      return {
        type: 'stdio',
        command: obj.command as string,
        args: (obj.args as string[]) ?? [],
        env: obj.env as Record<string, string> | undefined,
      };
      
    case 'http':
    case 'https':
      return {
        type,
        url: obj.url as string,
        headers: obj.headers as Record<string, string> | undefined,
      };
      
    case 'sse':
      return {
        type: 'sse',
        url: obj.url as string,
        headers: obj.headers as Record<string, string> | undefined,
      };
      
    default:
      throw new Error(`Unknown transport type: ${type}`);
  }
}
