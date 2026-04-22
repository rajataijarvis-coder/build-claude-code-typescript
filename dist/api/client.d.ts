import Anthropic from '@anthropic-ai/sdk';
export type Provider = 'direct' | 'aws' | 'gcp' | 'azure';
export interface ClientConfig {
    provider: Provider;
    apiKey?: string;
    region?: string;
    projectId?: string;
    endpoint?: string;
}
/**
 * Multi-Provider Client Factory
 *
 * Returns an Anthropic SDK client configured for the target provider.
 * The rest of the codebase never branches on provider - it's transparent.
 */
export declare function getAnthropicClient(config: ClientConfig): Promise<Anthropic>;
/**
 * Detect provider from environment
 */
export declare function detectProvider(): ClientConfig;
//# sourceMappingURL=client.d.ts.map