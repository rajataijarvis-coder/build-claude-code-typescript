// src/config/config.ts
export interface Config {
  apiKey: string;
  apiUrl: string;
  model: string;
  maxTokens: number;
  trustLevel: 'strict' | 'normal' | 'permissive';
  requirePermissions: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableSubAgents: boolean;
  enableMCP: boolean;
  enableMemory: boolean;
}

export class ConfigLoader {
  constructor(private env: string) {}

  async load(): Promise<Config> {
    return {
      apiKey: process.env.CLAUDE_API_KEY || '',
      apiUrl: 'https://api.anthropic.com/v1',
      model: 'claude-3-sonnet-20240229',
      maxTokens: 8192,
      trustLevel: 'normal',
      requirePermissions: true,
      logLevel: 'info',
      enableSubAgents: true,
      enableMCP: true,
      enableMemory: true
    };
  }
}
