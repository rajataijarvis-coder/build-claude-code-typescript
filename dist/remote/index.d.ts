/**
 * Remote Control Module
 *
 * Bridge protocols, Direct Connect, and upstream proxy for
 * remote agent control and cloud execution.
 */
export * from './types.js';
export { BoundedUUIDSet, createDeduplicationSets, checkDeduplication } from './BoundedUUIDSet.js';
export { FlushGate, CallbackFlushGate, createFlushGate } from './FlushGate.js';
export { BridgeTransport, parseSSEEvent, parseSSEData } from './BridgeTransport.js';
export { BridgeV2Transport, createBridgeV2Transport } from './BridgeV2Transport.js';
export { DirectConnectServer, createDirectConnectServer, parseCCURL } from './DirectConnectServer.js';
export { UpstreamProxy, createUpstreamProxy, encodeProxyChunk, decodeProxyChunk } from './UpstreamProxy.js';
//# sourceMappingURL=index.d.ts.map