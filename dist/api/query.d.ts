import { Anthropic } from '@anthropic-ai/sdk';
import { ClientConfig } from './client.js';
import { PromptContext } from './prompts.js';
import { StreamEvent } from './streaming.js';
export interface QueryParams {
    messages: Anthropic.MessageParam[];
    systemContext: PromptContext;
    clientConfig: ClientConfig;
    model?: string;
    tools?: Anthropic.Tool[];
    thinking?: boolean;
}
export type QueryEvent = StreamEvent | {
    type: 'system_prompt_built';
    sections: number;
} | {
    type: 'client_initialized';
    provider: string;
} | {
    type: 'retrying';
    attempt: number;
    reason: string;
} | {
    type: 'token_escalation';
    from: number;
    to: number;
};
/**
 * Query Model - Main API Entry Point
 *
 * Async generator that yields events throughout the request lifecycle.
 * Handles retries, token escalation, and streaming errors.
 */
export declare function queryModel(params: QueryParams): AsyncGenerator<QueryEvent>;
//# sourceMappingURL=query.d.ts.map