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
import { MCPServerConfig } from './types.js';
/** Configuration scopes in priority order */
export type ConfigScope = 'local' | 'user' | 'project' | 'enterprise' | 'managed' | 'claudeai' | 'dynamic';
/**
 * Load MCP configurations from all scopes
 */
export declare function loadMCPConfigs(): Promise<MCPServerConfig[]>;
/**
 * Parse MCP server config from JSON
 */
export declare function parseMCPServerConfig(name: string, json: unknown): MCPServerConfig;
//# sourceMappingURL=config.d.ts.map