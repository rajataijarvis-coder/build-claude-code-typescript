import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '../utils/logger.js';
/**
 * Multi-Provider Client Factory
 *
 * Returns an Anthropic SDK client configured for the target provider.
 * The rest of the codebase never branches on provider - it's transparent.
 */
export async function getAnthropicClient(config) {
    const logger = new Logger('info');
    logger.info(`Initializing ${config.provider} client`);
    switch (config.provider) {
        case 'direct':
            return new Anthropic({
                apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
            });
        case 'aws':
        case 'gcp':
        case 'azure':
            // For demo purposes, fall back to direct
            logger.info(`Provider ${config.provider} not fully implemented, using direct`);
            return new Anthropic({
                apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || 'demo-key',
            });
        default:
            throw new Error(`Unknown provider: ${config.provider}`);
    }
}
/**
 * Build fetch wrapper that injects client request ID
 *
 * This lets us correlate timeouts with server-side logs.
 * The server never assigns IDs to timed-out requests.
 */
function buildFetch() {
    const originalFetch = globalThis.fetch;
    return async (input, init) => {
        const requestId = crypto.randomUUID();
        const headers = new Headers(init?.headers);
        const url = input.toString();
        if (url.includes('anthropic.com') || url.includes('api.anthropic')) {
            headers.set('x-client-request-id', requestId);
        }
        return originalFetch(input, {
            ...init,
            headers,
        });
    };
}
/**
 * Detect provider from environment
 */
export function detectProvider() {
    if (process.env.ANTHROPIC_API_KEY) {
        return { provider: 'direct' };
    }
    if (process.env.AWS_REGION) {
        return {
            provider: 'aws',
            region: process.env.AWS_REGION
        };
    }
    if (process.env.GOOGLE_CLOUD_PROJECT) {
        return {
            provider: 'gcp',
            projectId: process.env.GOOGLE_CLOUD_PROJECT
        };
    }
    if (process.env.AZURE_OPENAI_ENDPOINT) {
        return {
            provider: 'azure',
            endpoint: process.env.AZURE_OPENAI_ENDPOINT
        };
    }
    throw new Error('No provider credentials found. Set ANTHROPIC_API_KEY or AWS_REGION.');
}
//# sourceMappingURL=client.js.map