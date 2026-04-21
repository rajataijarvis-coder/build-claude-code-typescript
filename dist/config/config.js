export class ConfigLoader {
    env;
    constructor(env) {
        this.env = env;
    }
    async load() {
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
//# sourceMappingURL=config.js.map