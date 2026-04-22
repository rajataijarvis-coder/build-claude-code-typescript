/**
 * MCP Protocol Types
 *
 * Type definitions for the Model Context Protocol.
 * Based on the MCP specification: https://modelcontextprotocol.io
 */
/** Session expiry detection -- Streamable HTTP returns 404 with code -32001 */
export function isMcpSessionExpiredError(error) {
    const httpStatus = 'code' in error ? error.code : undefined;
    if (httpStatus !== 404)
        return false;
    // Check JSON-RPC error code in message (fragile but necessary)
    return error.message.includes('"code":-32001') || error.message.includes('"code": -32001');
}
//# sourceMappingURL=types.js.map