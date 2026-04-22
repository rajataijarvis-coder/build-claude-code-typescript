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
import { getMCPServerSignature } from './wrapper.js';
/**
 * Load MCP configurations from all scopes
 */
export async function loadMCPConfigs() {
    const entries = [];
    // Load from each scope
    const scopeLoaders = {
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
                entries.push({ scope: scope, config });
            }
        }
        catch (error) {
            // Scope might not exist -- that's ok
            console.debug(`Failed to load ${scope} config:`, error);
        }
    }
    // Deduplicate by signature (content-based, not name-based)
    const seenSignatures = new Set();
    const deduplicated = [];
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
async function loadLocalConfig() {
    // In a real implementation, read from filesystem
    // For now, return empty
    return [];
}
/**
 * Load user config from ~/.claude.json
 */
async function loadUserConfig() {
    // In a real implementation, read from home directory
    return [];
}
/**
 * Load project-level config
 */
async function loadProjectConfig() {
    // In a real implementation, read from project root
    return [];
}
/**
 * Load enterprise-managed config
 */
async function loadEnterpriseConfig() {
    // In a real implementation, fetch from enterprise endpoint
    return [];
}
/**
 * Load plugin-provided server configs
 */
async function loadManagedConfig() {
    // In a real implementation, get from plugin system
    return [];
}
/**
 * Load Claude.ai connector configs
 */
async function loadClaudeAIConfig() {
    // In a real implementation, fetch from Claude.ai
    return [];
}
/**
 * Load dynamic/SDK configs
 */
async function loadDynamicConfig() {
    // In a real implementation, get from runtime
    return [];
}
/**
 * Parse MCP server config from JSON
 */
export function parseMCPServerConfig(name, json) {
    if (typeof json !== 'object' || json === null) {
        throw new Error(`Invalid config for ${name}: expected object`);
    }
    const obj = json;
    // Parse transport
    const transport = parseTransportConfig(obj);
    return {
        name,
        transport,
        auth: obj.auth,
    };
}
/**
 * Parse transport configuration
 */
function parseTransportConfig(obj) {
    // Default to stdio if no type specified
    const type = obj.type ?? 'stdio';
    switch (type) {
        case 'stdio':
            return {
                type: 'stdio',
                command: obj.command,
                args: obj.args ?? [],
                env: obj.env,
            };
        case 'http':
        case 'https':
            return {
                type,
                url: obj.url,
                headers: obj.headers,
            };
        case 'sse':
            return {
                type: 'sse',
                url: obj.url,
                headers: obj.headers,
            };
        default:
            throw new Error(`Unknown transport type: ${type}`);
    }
}
//# sourceMappingURL=config.js.map