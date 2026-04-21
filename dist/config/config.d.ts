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
export declare class ConfigLoader {
    private env;
    constructor(env: string);
    load(): Promise<Config>;
}
//# sourceMappingURL=config.d.ts.map