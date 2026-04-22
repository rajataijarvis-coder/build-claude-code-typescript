import { getAnthropicClient } from './client.js';
import { buildSystemPrompt } from './prompts.js';
import { streamWithWatchdog } from './streaming.js';
/**
 * Query Model - Main API Entry Point
 *
 * Async generator that yields events throughout the request lifecycle.
 * Handles retries, token escalation, and streaming errors.
 */
export async function* queryModel(params) {
    const model = params.model || 'claude-3-5-sonnet-20241022';
    const systemSections = buildSystemPrompt(params.systemContext);
    yield { type: 'system_prompt_built', sections: systemSections.length };
    const systemPrompt = systemSections
        .map(s => s.content)
        .join('\n\n');
    const client = await getAnthropicClient(params.clientConfig);
    yield { type: 'client_initialized', provider: params.clientConfig.provider };
    let attempt = 0;
    const maxAttempts = 2;
    while (attempt < maxAttempts) {
        attempt++;
        try {
            yield* streamWithWatchdog({
                client,
                model,
                messages: params.messages,
                system: systemPrompt,
                tools: params.tools,
                maxTokens: 8192,
            });
            return;
        }
        catch (error) {
            const errorMsg = error.message;
            if (errorMsg.includes('output length limit')) {
                yield { type: 'token_escalation', from: 8192, to: 64000 };
                yield* streamWithWatchdog({
                    client,
                    model,
                    messages: params.messages,
                    system: systemPrompt,
                    tools: params.tools,
                    maxTokens: 64000,
                });
                return;
            }
            if (attempt < maxAttempts) {
                yield {
                    type: 'retrying',
                    attempt,
                    reason: errorMsg
                };
            }
            else {
                throw error;
            }
        }
    }
}
const stickyLatches = new Map();
function assembleBetaHeaders(params) {
    const headers = [];
    if (params.thinking) {
        stickyLatches.set('thinking', true);
    }
    if (stickyLatches.get('thinking')) {
        headers.push('thinking-128k-2024-11-01');
    }
    return headers;
}
//# sourceMappingURL=query.js.map