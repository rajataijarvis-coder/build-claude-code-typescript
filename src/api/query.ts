import { Anthropic } from '@anthropic-ai/sdk';
import { getAnthropicClient, ClientConfig } from './client.js';
import { buildSystemPrompt, PromptContext } from './prompts.js';
import { streamWithWatchdog, StreamEvent } from './streaming.js';
import { Logger } from '../utils/logger.js';

export interface QueryParams {
  messages: Anthropic.MessageParam[];
  systemContext: PromptContext;
  clientConfig: ClientConfig;
  model?: string;
  tools?: Anthropic.Tool[];
  thinking?: boolean;
}

export type QueryEvent =
  | StreamEvent
  | { type: 'system_prompt_built'; sections: number }
  | { type: 'client_initialized'; provider: string }
  | { type: 'retrying'; attempt: number; reason: string }
  | { type: 'token_escalation'; from: number; to: number };

/**
 * Query Model - Main API Entry Point
 * 
 * Async generator that yields events throughout the request lifecycle.
 * Handles retries, token escalation, and streaming errors.
 */
export async function* queryModel(
  params: QueryParams
): AsyncGenerator<QueryEvent> {
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
      
    } catch (error) {
      const errorMsg = (error as Error).message;
      
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
      } else {
        throw error;
      }
    }
  }
}

const stickyLatches: Map<string, boolean> = new Map();

function assembleBetaHeaders(params: QueryParams): string[] {
  const headers: string[] = [];

  if (params.thinking) {
    stickyLatches.set('thinking', true);
  }
  if (stickyLatches.get('thinking')) {
    headers.push('thinking-128k-2024-11-01');
  }

  return headers;
}
