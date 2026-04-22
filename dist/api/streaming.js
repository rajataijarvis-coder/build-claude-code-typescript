import { Logger } from '../utils/logger.js';
/**
 * Stream with idle watchdog
 *
 * If no chunks arrive for 90 seconds, abort and retry.
 * This catches silent connection deaths.
 */
export async function* streamWithWatchdog(config) {
    const IDLE_TIMEOUT_MS = 90000;
    const WARNING_MS = 45000;
    const logger = new Logger('info');
    let lastChunkTime = Date.now();
    let warningShown = false;
    let idleTimer = null;
    const abortController = new AbortController();
    try {
        const stream = config.client.messages.stream({
            model: config.model,
            max_tokens: config.maxTokens || 8192,
            messages: config.messages,
            system: config.system,
            tools: config.tools,
        }, {
            signal: abortController.signal,
        });
        const checkIdle = () => {
            const idleTime = Date.now() - lastChunkTime;
            if (idleTime > WARNING_MS && !warningShown) {
                logger.info('Stream idle warning - 45s without data');
                warningShown = true;
            }
            if (idleTime > IDLE_TIMEOUT_MS) {
                logger.info('Stream idle timeout - aborting');
                abortController.abort(new Error('Idle timeout'));
            }
        };
        idleTimer = setInterval(checkIdle, 5000);
        for await (const event of stream) {
            lastChunkTime = Date.now();
            switch (event.type) {
                case 'content_block_delta':
                    if (event.delta.type === 'text_delta') {
                        yield { type: 'text', content: event.delta.text };
                    }
                    break;
                case 'content_block_start':
                    if (event.content_block.type === 'tool_use') {
                        yield {
                            type: 'tool_use',
                            id: event.content_block.id,
                            name: event.content_block.name,
                            input: event.content_block.input,
                        };
                    }
                    break;
                case 'message_stop':
                    yield { type: 'done' };
                    break;
            }
        }
    }
    catch (error) {
        if (error.message.includes('Idle timeout')) {
            yield { type: 'error', error: new Error('Stream timed out after 90s idle') };
        }
        else {
            yield { type: 'error', error: error };
        }
    }
    finally {
        if (idleTimer)
            clearInterval(idleTimer);
    }
}
/**
 * Non-streaming fallback
 */
export async function queryNonStreaming(config) {
    const logger = new Logger('info');
    logger.info('Using non-streaming fallback');
    return config.client.messages.create({
        model: config.model,
        max_tokens: config.maxTokens || 8192,
        messages: config.messages,
        system: config.system,
        tools: config.tools,
        stream: false,
    });
}
//# sourceMappingURL=streaming.js.map