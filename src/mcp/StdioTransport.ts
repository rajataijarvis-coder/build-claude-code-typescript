/**
 * stdio Transport for MCP
 * 
 * Spawns a subprocess and communicates via stdin/stdout.
 * This is the simplest and most common transport type.
 */

import { spawn, ChildProcess } from 'child_process';
import { Transport, JSONRPCMessage } from './types.js';

export interface StdioTransportOptions {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

/**
 * stdio transport -- spawn subprocess and communicate over pipes
 */
export class StdioTransport implements Transport {
  closed = false;
  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  
  private process: ChildProcess | null = null;
  private buffer = '';
  
  constructor(private options: StdioTransportOptions) {}
  
  /**
   * Start the subprocess and begin listening
   */
  async start(): Promise<void> {
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
      this.process.stdout?.on('data', (data: Buffer) => {
        this.buffer += data.toString('utf-8');
        this.processBuffer();
      });
      
      // Handle stderr (log but don't fail)
      this.process.stderr?.on('data', (data: Buffer) => {
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
  private processBuffer(): void {
    // JSON-RPC messages are newline-delimited JSON
    const lines = this.buffer.split('\n');
    
    // Keep the last line if it's incomplete
    this.buffer = lines.pop() || '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      try {
        const message = JSON.parse(trimmed) as JSONRPCMessage;
        if (message.jsonrpc === '2.0') {
          this.onmessage?.(message);
        }
      } catch (error) {
        console.error('Failed to parse JSON-RPC message:', trimmed);
      }
    }
  }
  
  /**
   * Send a message to the subprocess
   */
  async send(message: JSONRPCMessage): Promise<void> {
    if (this.closed || !this.process?.stdin) {
      throw new Error('Transport is closed');
    }
    
    const line = JSON.stringify(message) + '\n';
    this.process.stdin.write(line);
  }
  
  /**
   * Close the transport and kill the subprocess
   */
  async close(): Promise<void> {
    if (this.closed) return;
    
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
