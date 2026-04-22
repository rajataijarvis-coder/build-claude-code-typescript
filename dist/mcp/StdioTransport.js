/**
 * stdio Transport for MCP
 *
 * Spawns a subprocess and communicates via stdin/stdout.
 * This is the simplest and most common transport type.
 */
import { spawn } from 'child_process';
/**
 * stdio transport -- spawn subprocess and communicate over pipes
 */
export class StdioTransport {
    options;
    closed = false;
    onmessage;
    onclose;
    onerror;
    process = null;
    buffer = '';
    constructor(options) {
        this.options = options;
    }
    /**
     * Start the subprocess and begin listening
     */
    async start() {
        if (this.process) {
            throw new Error('Transport already started');
        }
        return new Promise((resolve, reject) => {
            const { command, args = [], env, cwd } = this.options;
            // Spawn the subprocess with piped stdio
            this.process = spawn(command, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: env ? { ...process.env, ...env } : process.env,
                cwd,
            });
            // Handle process errors
            this.process.on('error', (error) => {
                this.onerror?.(error);
                reject(error);
            });
            // Handle stdout data
            this.process.stdout?.on('data', (data) => {
                this.buffer += data.toString('utf-8');
                this.processBuffer();
            });
            // Handle stderr (log but don't fail)
            this.process.stderr?.on('data', (data) => {
                console.error(`[MCP stderr] ${data.toString('utf-8').trim()}`);
            });
            // Handle process exit
            this.process.on('exit', (code) => {
                if (code !== 0 && code !== null) {
                    this.onerror?.(new Error(`Process exited with code ${code}`));
                }
                this.closed = true;
                this.onclose?.();
            });
            // Give it a moment to start
            setTimeout(resolve, 100);
        });
    }
    /**
     * Process accumulated buffer for complete JSON-RPC messages
     */
    processBuffer() {
        // JSON-RPC messages are newline-delimited JSON
        const lines = this.buffer.split('\n');
        // Keep the last line if it's incomplete
        this.buffer = lines.pop() || '';
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed)
                continue;
            try {
                const message = JSON.parse(trimmed);
                if (message.jsonrpc === '2.0') {
                    this.onmessage?.(message);
                }
            }
            catch (error) {
                console.error('Failed to parse JSON-RPC message:', trimmed);
            }
        }
    }
    /**
     * Send a message to the subprocess
     */
    async send(message) {
        if (this.closed || !this.process?.stdin) {
            throw new Error('Transport is closed');
        }
        const line = JSON.stringify(message) + '\n';
        this.process.stdin.write(line);
    }
    /**
     * Close the transport and kill the subprocess
     */
    async close() {
        if (this.closed)
            return;
        this.closed = true;
        if (this.process) {
            // Give it a chance to clean up
            this.process.stdin?.end();
            // Kill after grace period
            setTimeout(() => {
                if (!this.process?.killed) {
                    this.process?.kill('SIGTERM');
                }
            }, 1000);
        }
        this.onclose?.();
    }
}
//# sourceMappingURL=StdioTransport.js.map