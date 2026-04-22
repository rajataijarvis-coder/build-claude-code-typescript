import { Anthropic } from '@anthropic-ai/sdk';
export interface StreamConfig {
    client: Anthropic;
    model: string;
    messages: Anthropic.MessageParam[];
    system?: string;
    tools?: Anthropic.Tool[];
    maxTokens?: number;
}
export type StreamEvent = {
    type: 'text';
    content: string;
} | {
    type: 'tool_use';
    id: string;
    name: string;
    input: unknown;
} | {
    type: 'tool_input';
    id: string;
    partial: string;
} | {
    type: 'done';
} | {
    type: 'error';
    error: Error;
};
/**
 * Stream with idle watchdog
 *
 * If no chunks arrive for 90 seconds, abort and retry.
 * This catches silent connection deaths.
 */
export declare function streamWithWatchdog(config: StreamConfig): AsyncGenerator<StreamEvent>;
/**
 * Non-streaming fallback
 */
export declare function queryNonStreaming(config: StreamConfig): Promise<Anthropic.Message>;
//# sourceMappingURL=streaming.d.ts.map