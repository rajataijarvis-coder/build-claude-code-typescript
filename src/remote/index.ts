/**
 * Remote Control Module
 * 
 * Bridge protocols, Direct Connect, and upstream proxy for
 * remote agent control and cloud execution.
 */

// Types
export * from './types.js';

// Deduplication
export { BoundedUUIDSet, createDeduplicationSets, checkDeduplication } from './BoundedUUIDSet.js';

// Flush gate
export { FlushGate, CallbackFlushGate, createFlushGate } from './FlushGate.js';

// Bridge transport base
export { BridgeTransport, parseSSEEvent, parseSSEData } from './BridgeTransport.js';

// Bridge v2
export { BridgeV2Transport, createBridgeV2Transport } from './BridgeV2Transport.js';

// Direct Connect
export { DirectConnectServer, createDirectConnectServer, parseCCURL } from './DirectConnectServer.js';

// Upstream proxy
export { UpstreamProxy, createUpstreamProxy, encodeProxyChunk, decodeProxyChunk } from './UpstreamProxy.js';
