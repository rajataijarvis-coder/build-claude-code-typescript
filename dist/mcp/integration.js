/**
 * MCP Integration with Tool System
 *
 * Wraps MCP tools to implement the internal Tool interface,
 * enabling seamless use alongside built-in tools.
 */
import { z } from 'zod';
import { getMCPClient } from './client.js';
import { getConcurrencyBehavior } from './wrapper.js';
/**
 * Convert an MCP wrapped tool to internal Tool interface
 */
export function createMCPTool(wrapped) {
    // Create Zod schema from MCP input schema
    const inputSchema = z.object({
        input: z.record(z.unknown()),
    });
    return {
        name: wrapped.name,
        description: wrapped.description,
        inputSchema,
        // Execute the MCP tool
        async call(input) {
            const result = await wrapped.call(input.input ?? {});
            return {
                data: formatResultForModel(result),
            };
        },
        // Concurrency safety based on annotations
        isConcurrencySafe() {
            return getConcurrencyBehavior(wrapped.annotations).safeForConcurrency;
        },
        // Read-only based on annotations
        isReadOnly() {
            return wrapped.annotations?.readOnlyHint ?? false;
        },
        // Permission check based on annotations
        checkPermissions() {
            if (getConcurrencyBehavior(wrapped.annotations).requiresExtraPermission) {
                return {
                    behavior: 'ask',
                    reason: `MCP tool ${wrapped.originalName} from ${wrapped.name.split('__')[1]} is marked as potentially destructive`,
                };
            }
            return { behavior: 'passthrough' };
        },
        // Result size limit
        maxResultSizeChars: 10000,
        // Always enabled
        isEnabled() {
            return true;
        },
    };
}
/**
 * Format MCP tool result for model consumption
 */
function formatResultForModel(result) {
    if (result.isError) {
        const errorText = result.content
            .map(item => item.text ?? '')
            .join('');
        return `Error: ${errorText}`;
    }
    return result.content
        .map(item => item.text ?? '')
        .join('\n');
}
/**
 * Load all MCP tools and return as Tool array
 */
export async function loadMCPTools() {
    const client = getMCPClient();
    const connections = client.getConnections();
    const tools = [];
    for (const connection of connections) {
        if (connection.state !== 'connected') {
            continue;
        }
        const wrappedTools = client.getWrappedTools(connection.id);
        for (const wrapped of wrappedTools) {
            tools.push(createMCPTool(wrapped));
        }
    }
    return tools;
}
/**
 * Initialize MCP connections from config
 */
export async function initializeMCP() {
    const { loadMCPConfigs } = await import('./config.js');
    const configs = await loadMCPConfigs();
    const client = getMCPClient();
    // Connect to servers in batches
    // Local servers: batch of 3 (spawning processes can exhaust file descriptors)
    // Remote servers: batch of 20
    const localConfigs = configs.filter(c => c.transport.type === 'stdio');
    const remoteConfigs = configs.filter(c => c.transport.type !== 'stdio');
    // Connect local servers in batches of 3
    for (let i = 0; i < localConfigs.length; i += 3) {
        const batch = localConfigs.slice(i, i + 3);
        await Promise.all(batch.map(config => client.connect(config)));
    }
    // Connect remote servers in batches of 20
    for (let i = 0; i < remoteConfigs.length; i += 20) {
        const batch = remoteConfigs.slice(i, i + 20);
        await Promise.all(batch.map(config => client.connect(config)));
    }
}
/**
 * Get MCP connection status for UI display
 */
export function getMCPStatus() {
    const client = getMCPClient();
    return client.getConnections().map(conn => ({
        name: conn.config.name,
        state: conn.state,
        toolCount: conn.tools.length,
        error: conn.error,
    }));
}
//# sourceMappingURL=integration.js.map