/**
 * HTTP/SSE Transport for MCP
 *
 * Implements Streamable HTTP (current spec) and legacy SSE transport.
 * Includes timeout layering and session expiry detection.
 */
import { isMcpSessionExpiredError } from './types.js';
// Timeout constants
const DEFAULT_CONNECTION_TIMEOUT = 30000; // 30s for connection
const DEFAULT_REQUEST_TIMEOUT = 60000; // 60s per request (fresh each time)
/**
 * HTTP transport -- Streamable HTTP per MCP spec
 */
export class HTTPTransport {
    options;
    closed = false;
    onmessage;
    onclose;
    onerror;
    sessionId = null;
    abortController = null;
    constructor(options) {
        this.options = options;
    }
    /**
     * Start the transport (HTTP is connectionless, so this is a no-op)
     */
    async start() {
        // HTTP is stateless, nothing to start
    }
    /**
     * Send a message via HTTP POST
     */
    async send(message) {
        if (this.closed) {
            throw new Error('Transport is closed');
        }
        const timeout = this.options.timeout ?? DEFAULT_REQUEST_TIMEOUT;
        // Fresh AbortSignal for each request (not reused)
        this.abortController = new AbortController();
        const timeoutId = setTimeout(() => this.abortController?.abort(), timeout);
        try {
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream',
                ...this.options.headers,
            };
            // Include session ID if we have one
            if (this.sessionId) {
                headers['Mcp-Session-Id'] = this.sessionId;
            }
            const response = await fetch(this.options.url, {
                method: 'POST',
                headers,
                body: JSON.stringify(message),
                signal: this.abortController.signal,
            });
            clearTimeout(timeoutId);
            // Extract session ID from response
            const newSessionId = response.headers.get('Mcp-Session-Id');
            if (newSessionId) {
                this.sessionId = newSessionId;
            }
            if (!response.ok) {
                const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
                error.code = response.status;
                throw error;
            }
            // Parse response
            const contentType = response.headers.get('Content-Type') || '';
            if (contentType.includes('text/event-stream')) {
                // SSE stream -- handle server-sent events
                await this.handleSSEStream(response.body);
            }
            else {
                // Regular JSON response
                const result = await response.json();
                if (result.jsonrpc === '2.0') {
                    this.onmessage?.(result);
                }
            }
        }
        catch (error) {
            clearTimeout(timeoutId);
            // Check for session expiry
            if (error instanceof Error && isMcpSessionExpiredError(error)) {
                // Clear session and retry once
                this.sessionId = null;
                return this.send(message);
            }
            this.onerror?.(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    /**
     * Handle Server-Sent Events stream
     */
    async handleSSEStream(body) {
        if (!body)
            return;
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                // Process SSE events
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                let eventData = '';
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        eventData = line.slice(6);
                    }
                    else if (line === '' && eventData) {
                        // End of event
                        try {
                            const message = JSON.parse(eventData);
                            if (message.jsonrpc === '2.0') {
                                this.onmessage?.(message);
                            }
                        }
                        catch (e) {
                            console.error('Failed to parse SSE event:', eventData);
                        }
                        eventData = '';
                    }
                }
            }
        }
        finally {
            reader.releaseLock();
        }
    }
    /**
     * Close the transport
     */
    async close() {
        if (this.closed)
            return;
        this.closed = true;
        this.abortController?.abort();
        this.onclose?.();
    }
}
/**
 * Legacy SSE transport -- pre-2025 specification
 */
export class SSETransport {
    options;
    closed = false;
    onmessage;
    onclose;
    onerror;
    eventSource = null;
    messageQueue = [];
    requestId = 0;
    constructor(options) {
        this.options = options;
    }
    /**
     * Start SSE connection
     */
    async start() {
        return new Promise((resolve, reject) => {
            const url = new URL(this.options.url);
            // Add any custom headers as query params (SSE doesn't support headers)
            if (this.options.headers) {
                for (const [key, value] of Object.entries(this.options.headers)) {
                    url.searchParams.set(key, value);
                }
            }
            this.eventSource = new EventSource(url.toString());
            this.eventSource.onopen = () => resolve();
            this.eventSource.onerror = (error) => {
                this.onerror?.(new Error('SSE connection failed'));
                reject(error);
            };
            this.eventSource.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.jsonrpc === '2.0') {
                        this.onmessage?.(message);
                    }
                }
                catch (e) {
                    console.error('Failed to parse SSE message:', event.data);
                }
            };
        });
    }
    /**
     * Send a message (SSE is server->client only, so we use HTTP POST)
     */
    async send(message) {
        if (this.closed) {
            throw new Error('Transport is closed');
        }
        // SSE is one-way, we need a separate POST endpoint
        const postUrl = this.options.url.replace('/sse', '/message');
        const response = await fetch(postUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.options.headers,
            },
            body: JSON.stringify(message),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    }
    /**
     * Close the transport
     */
    async close() {
        if (this.closed)
            return;
        this.closed = true;
        this.eventSource?.close();
        this.onclose?.();
    }
}
//# sourceMappingURL=HTTPTransport.js.map