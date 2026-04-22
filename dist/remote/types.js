/**
 * Remote Control Types
 *
 * Type definitions for bridge protocols, Direct Connect,
 * and upstream proxy systems.
 */
/** WebSocket close codes */
export var WebSocketCloseCode;
(function (WebSocketCloseCode) {
    WebSocketCloseCode[WebSocketCloseCode["NORMAL"] = 1000] = "NORMAL";
    WebSocketCloseCode[WebSocketCloseCode["GOING_AWAY"] = 1001] = "GOING_AWAY";
    WebSocketCloseCode[WebSocketCloseCode["PROTOCOL_ERROR"] = 1002] = "PROTOCOL_ERROR";
    WebSocketCloseCode[WebSocketCloseCode["UNSUPPORTED_DATA"] = 1003] = "UNSUPPORTED_DATA";
    WebSocketCloseCode[WebSocketCloseCode["NO_STATUS"] = 1005] = "NO_STATUS";
    WebSocketCloseCode[WebSocketCloseCode["ABNORMAL"] = 1006] = "ABNORMAL";
    WebSocketCloseCode[WebSocketCloseCode["INVALID_FRAME"] = 1007] = "INVALID_FRAME";
    WebSocketCloseCode[WebSocketCloseCode["POLICY_VIOLATION"] = 1008] = "POLICY_VIOLATION";
    WebSocketCloseCode[WebSocketCloseCode["MESSAGE_TOO_BIG"] = 1009] = "MESSAGE_TOO_BIG";
    WebSocketCloseCode[WebSocketCloseCode["EXTENSION_REQUIRED"] = 1010] = "EXTENSION_REQUIRED";
    WebSocketCloseCode[WebSocketCloseCode["INTERNAL_ERROR"] = 1011] = "INTERNAL_ERROR";
    WebSocketCloseCode[WebSocketCloseCode["SERVICE_RESTART"] = 1012] = "SERVICE_RESTART";
    WebSocketCloseCode[WebSocketCloseCode["TRY_AGAIN_LATER"] = 1013] = "TRY_AGAIN_LATER";
    WebSocketCloseCode[WebSocketCloseCode["BAD_GATEWAY"] = 1014] = "BAD_GATEWAY";
    WebSocketCloseCode[WebSocketCloseCode["TLS_HANDSHAKE"] = 1015] = "TLS_HANDSHAKE";
    // Application codes
    WebSocketCloseCode[WebSocketCloseCode["UNAUTHORIZED"] = 4003] = "UNAUTHORIZED";
    WebSocketCloseCode[WebSocketCloseCode["SESSION_NOT_FOUND"] = 4001] = "SESSION_NOT_FOUND";
    WebSocketCloseCode[WebSocketCloseCode["RATE_LIMITED"] = 4004] = "RATE_LIMITED";
})(WebSocketCloseCode || (WebSocketCloseCode = {}));
/** Get reconnection strategy for close code */
export function getReconnectionStrategy(code, attemptCount) {
    // Permanent failures -- don't retry
    if (code === WebSocketCloseCode.UNAUTHORIZED) {
        return { maxRetries: 0, initialDelay: 0, maxDelay: 0, multiplier: 1, type: 'none' };
    }
    // Session not found -- transient, 3 retries with linear backoff
    if (code === WebSocketCloseCode.SESSION_NOT_FOUND) {
        return {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 5000,
            multiplier: 1,
            type: 'linear',
        };
    }
    // Other transient failures -- exponential backoff
    return {
        maxRetries: 5,
        initialDelay: 1000,
        maxDelay: 30000,
        multiplier: 2,
        type: 'exponential',
    };
}
/** Type guard for bridge messages */
export function isBridgeMessage(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'type' in obj &&
        typeof obj.type === 'string');
}
/** Type guard for control messages */
export function isControlMessage(obj) {
    return (isBridgeMessage(obj) &&
        (obj.type === 'control_request' ||
            obj.type === 'control_response'));
}
//# sourceMappingURL=types.js.map