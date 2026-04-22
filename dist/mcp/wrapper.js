/**
 * MCP Tool Wrapper
 *
 * Transforms MCP tool definitions into the internal Tool interface.
 * Handles: name normalization, description truncation, schema passthrough,
 * annotation mapping for concurrency hints.
 */
// Maximum description length to prevent context waste
const MAX_DESCRIPTION_LENGTH = 2048;
// Valid MCP tool name pattern (alphanumeric, hyphen, underscore)
const VALID_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
/**
 * Wrap an MCP tool for integration with the internal Tool system
 */
export function wrapMCPTool(tool, serverName, callTool) {
    return {
        name: qualifyToolName(tool.name, serverName),
        originalName: tool.name,
        description: truncateDescription(tool.description),
        inputSchema: sanitizeSchema(tool.inputSchema),
        annotations: tool.annotations,
        call: (input) => callTool(tool.name, input ?? {}),
    };
}
/**
 * Create a fully qualified tool name
 * Format: mcp__{serverName}__{toolName}
 */
export function qualifyToolName(toolName, serverName) {
    const normalizedTool = normalizeNameForMCP(toolName);
    const normalizedServer = normalizeNameForMCP(serverName);
    return `mcp__${normalizedServer}__${normalizedTool}`;
}
/**
 * Normalize a name for MCP compatibility
 *
 * MCP tool names must match: ^[a-zA-Z0-9_-]{1,64}$
 * Invalid characters are replaced with underscores.
 */
export function normalizeNameForMCP(name) {
    // Replace invalid characters with underscores
    let normalized = name
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_{2,}/g, '_'); // Collapse multiple underscores
    // Ensure length constraint
    if (normalized.length > 64) {
        normalized = normalized.slice(0, 64);
    }
    // Ensure not empty
    if (normalized.length === 0) {
        normalized = 'unnamed';
    }
    return normalized;
}
/**
 * Truncate description to prevent context waste
 *
 * OpenAPI-generated servers have been observed dumping 15-60KB into
 * descriptions -- roughly 15,000 tokens per turn for a single tool.
 */
function truncateDescription(description) {
    if (!description)
        return '';
    if (description.length <= MAX_DESCRIPTION_LENGTH) {
        return description;
    }
    // Truncate with ellipsis
    const truncated = description.slice(0, MAX_DESCRIPTION_LENGTH - 3);
    return truncated + '...';
}
/**
 * Sanitize JSON Schema for tool inputs
 *
 * Removes potentially problematic fields while preserving structure.
 */
function sanitizeSchema(schema) {
    // Schema passes through mostly unchanged
    // In production, you might want to:
    // - Remove $defs references that won't resolve
    // - Flatten nested anyOf/oneOf for simpler handling
    // - Add additional validation constraints
    return {
        type: schema.type ?? 'object',
        properties: schema.properties ?? {},
        required: schema.required ?? [],
        additionalProperties: schema.additionalProperties ?? false,
        description: schema.description,
    };
}
/**
 * Compute signature for MCP server deduplication
 *
 * Two servers with different names but the same command/URL are
 * recognized as the same server for config deduplication.
 */
export function getMCPServerSignature(config) {
    const transport = config.transport;
    if (transport.type === 'stdio' && transport.command) {
        // For stdio: include command and args
        const args = transport.args ?? [];
        return `stdio:[${transport.command},${args.join(',')}]`;
    }
    if (transport.url) {
        // For network transports: just the URL
        return `url:${transport.url}`;
    }
    // Fallback
    return `${transport.type}:unknown`;
}
/**
 * Map MCP annotations to concurrency behavior
 *
 * readOnlyHint marks tools safe for concurrent execution.
 * destructiveHint triggers extra permission scrutiny.
 *
 * Note: These annotations come from the MCP server. A malicious server
 * could mark destructive tools as read-only. This is an accepted trust
 * boundary -- the user opted into the server.
 */
export function getConcurrencyBehavior(annotations) {
    return {
        safeForConcurrency: annotations?.readOnlyHint ?? false,
        requiresExtraPermission: annotations?.destructiveHint ?? false,
    };
}
/**
 * Sanitize tool output for display
 *
 * Removes potentially malicious Unicode that could mislead the model:
 * - Bidirectional overrides (can flip text direction)
 * - Zero-width joiners (can hide characters)
 * - Control characters
 */
export function sanitizeToolOutput(text) {
    // Remove bidirectional formatting characters
    // U+202A to U+202E: LRE, RLE, PDF, LRO, RLO
    const bidiPattern = /[\u202A-\u202E]/g;
    // Remove zero-width characters
    // U+200B: zero-width space
    // U+200C: zero-width non-joiner
    // U+200D: zero-width joiner
    // U+FEFF: zero-width no-break space (BOM)
    const zeroWidthPattern = /[\u200B\u200C\u200D\uFEFF]/g;
    // Remove control characters except newline, tab, carriage return
    const controlPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;
    return text
        .replace(bidiPattern, '')
        .replace(zeroWidthPattern, '')
        .replace(controlPattern, '');
}
/**
 * Convert MCP tool result to string for model consumption
 */
export function formatToolResult(result) {
    if (result.isError) {
        return `Error: ${result.content.map(c => c.text ?? '').join('')}`;
    }
    const text = result.content
        .map(item => item.text ?? '')
        .join('');
    return sanitizeToolOutput(text);
}
//# sourceMappingURL=wrapper.js.map