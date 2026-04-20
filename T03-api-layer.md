# Tutorial 3: The API Layer - Multi-Provider Client Factory

## What We're Building

Claude Code's API layer handles communication with language models. We'll build a multi-provider client factory that supports Anthropic's API with proper error handling, retries, and streaming.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Factory   │───▶│   Client    │───▶│   Stream    │  │
│  │             │    │             │    │             │  │
│  │ createApi() │    │  Anthropic  │    │  Response   │  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Features:                                                  │
│  • Retry with exponential backoff                          │
│  • Error classification (retryable vs fatal)             │
│  • Streaming response handling                            │
│  • Request/response logging                                 │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

### API Client Factory (api/factory.ts)

```typescript
/**
 * API Client Factory
 * 
 * Creates configured API clients with proper error handling.
 */

import Anthropic from '@anthropic-ai/sdk';
import { APIError } from '@anthropic-ai/sdk/error';

export interface ApiConfig {
  apiKey: string;
  model: string;
  maxRetries?: number;
  timeoutMs?: number;
  baseUrl?: string;
}

export interface ApiClient {
  readonly model: string;
  sendMessage(params: SendMessageParams): Promise<MessageResponse>;
  streamMessage(params: SendMessageParams): AsyncGenerator<StreamChunk>;
}

export interface SendMessageParams {
  messages: MessageParam[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
}

export interface MessageParam {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MessageResponse {
  content: string;
  tool_calls?: ToolCall[];
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  stop_reason: string | null;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface StreamChunk {
  type: 'content' | 'tool_call' | 'usage' | 'stop';
  content?: string;
  tool_call?: ToolCall;
  usage?: { input_tokens: number; output_tokens: number };
  stop_reason?: string;
}

/**
 * Create an API client with retry logic
 */
export function createApiClient(config: ApiConfig): ApiClient {
  const anthropic = new Anthropic({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    maxRetries: config.maxRetries ?? 3,
    timeout: config.timeoutMs ?? 60000,
  });
  
  return {
    model: config.model,
    
    async sendMessage(params: SendMessageParams): Promise<MessageResponse> {
      const response = await anthropic.messages.create({
        model: config.model,
        max_tokens: params.maxTokens ?? 4096,
        temperature: params.temperature ?? 0.7,
        system: params.system,
        messages: params.messages,
        tools: params.tools,
      });
      
      // Extract text content
      const textContent = response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('');
      
      // Extract tool calls
      const toolCalls = response.content
        .filter(block => block.type === 'tool_use')
        .map(block => ({
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        }));
      
      return {
        content: textContent,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: {
          input_tokens: response.usage?.input_tokens ?? 0,
          output_tokens: response.usage?.output_tokens ?? 0,
        },
        stop_reason: response.stop_reason,
      };
    },
    
    async *streamMessage(params: SendMessageParams): AsyncGenerator<StreamChunk> {
      const stream = await anthropic.messages.create({
        model: config.model,
        max_tokens: params.maxTokens ?? 4096,
        temperature: params.temperature ?? 0.7,
        system: params.system,
        messages: params.messages,
        tools: params.tools,
        stream: true,
      });
      
      let currentToolCall: ToolCall | undefined;
      
      for await (const event of stream) {
        switch (event.type) {
          case 'content_block_delta':
            if (event.delta.type === 'text_delta') {
              yield {
                type: 'content',
                content: event.delta.text,
              };
            }
            break;
            
          case 'content_block_start':
            if (event.content_block.type === 'tool_use') {
              currentToolCall = {
                id: event.content_block.id,
                name: event.content_block.name,
                input: {},
              };
            }
            break;
            
          case 'tool_use_delta':
            if (currentToolCall && event.delta.partial_json) {
              // Accumulate partial JSON
              currentToolCall.input = JSON.parse(
                JSON.stringify(currentToolCall.input) + event.delta.partial_json
              );
            }
            break;
            
          case 'content_block_stop':
            if (currentToolCall) {
              yield {
                type: 'tool_call',
                tool_call: currentToolCall,
              };
              currentToolCall = undefined;
            }
            break;
            
          case 'message_stop':
            yield {
              type: 'stop',
              stop_reason: event.message?.stop_reason,
            };
            break;
        }
      }
    },
  };
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on client errors (4xx)
      if (error instanceof APIError) {
        if (error.status >= 400 && error.status < 500) {
          throw error;  // Client errors are not retryable
        }
      }
      
      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`  ⚠️ API call failed, retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError ?? new Error('Max retries exceeded');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof APIError) {
    // Retry on server errors (5xx) and rate limits (429)
    return error.status >= 500 || error.status === 429;
  }
  
  // Retry on network errors
  if (error instanceof Error) {
    const networkErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ENOTFOUND',
    ];
    return networkErrors.some(code => 
      error.message.includes(code) || 
      (error as NodeJS.ErrnoException).code === code
    );
  }
  
  return false;
}
```

### Error Types (api/errors.ts)

```typescript
/**
 * API Error Types
 * 
 * Classifies errors for appropriate handling.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string, public readonly retryAfterMs?: number) {
    super(message, 'RATE_LIMIT', true);
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Invalid API key') {
    super(message, 'AUTHENTICATION', false);
    this.name = 'AuthenticationError';
  }
}

export class ContextLengthError extends ApiError {
  constructor(message: string = 'Context too long') {
    super(message, 'CONTEXT_LENGTH', false);
    this.name = 'ContextLengthError';
  }
}

export class ModelNotFoundError extends ApiError {
  constructor(model: string) {
    super(`Model not found: ${model}`, 'MODEL_NOT_FOUND', false);
    this.name = 'ModelNotFoundError';
  }
}

/**
 * Classify an error from the Anthropic SDK
 */
export function classifyError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return new RateLimitError(error.message);
    }
    
    if (message.includes('invalid api key') || message.includes('authentication')) {
      return new AuthenticationError(error.message);
    }
    
    if (message.includes('context length') || message.includes('too many tokens')) {
      return new ContextLengthError(error.message);
    }
    
    if (message.includes('model') && message.includes('not found')) {
      return new ModelNotFoundError(error.message);
    }
    
    return new ApiError(error.message, 'UNKNOWN', true);
  }
  
  return new ApiError(String(error), 'UNKNOWN', true);
}
```

### Usage Example

```typescript
import { createApiClient, withRetry } from './api/factory.js';

// Create client
const api = createApiClient({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-5-sonnet-20241022',
  maxRetries: 3,
  timeoutMs: 60000,
});

// Non-streaming call
const response = await withRetry(() =>
  api.sendMessage({
    messages: [{ role: 'user', content: 'Hello!' }],
    system: 'You are a helpful assistant.',
    maxTokens: 1000,
  })
);

console.log(response.content);
console.log(`Used ${response.usage.input_tokens} input tokens`);

// Streaming call
for await (const chunk of api.streamMessage({
  messages: [{ role: 'user', content: 'Write a poem' }],
})) {
  if (chunk.type === 'content') {
    process.stdout.write(chunk.content);
  }
  if (chunk.type === 'stop') {
    console.log('\n[Done]');
  }
}
```

## Key Concepts for Junior Devs

### Why a Factory?

The factory pattern centralizes client creation:

```typescript
// Factory encapsulates configuration
const api = createApiClient(config);

// Consumer doesn't need to know about Anthropic SDK
const response = await api.sendMessage(params);
```

### Retry Strategy

```
Attempt 1: Fail ──▶ Wait 1s ──▶ Attempt 2: Fail ──▶ Wait 2s ──▶ Attempt 3
```

Exponential backoff prevents thundering herd.

### Streaming Architecture

```
API ──▶ Chunk 1 ──▶ Chunk 2 ──▶ Chunk 3 ──▶ ...
         ▼
    Generator yields each chunk immediately
         ▼
    UI updates in real-time
```

## Error Classification

| Error Type | Retry? | Example |
|------------|--------|---------|
| Rate Limit | ✅ Yes | Too many requests |
| Server Error | ✅ Yes | 500 Internal Error |
| Authentication | ❌ No | Invalid API key |
| Context Length | ❌ No | Too many tokens |
| Model Not Found | ❌ No | Invalid model name |

## Testing

```typescript
import { createApiClient } from './api/factory.js';

test('client sends message successfully', async () => {
  const api = createApiClient({
    apiKey: 'test-key',
    model: 'claude-3-opus',
  });
  
  // Mock the Anthropic SDK
  // ... test implementation
});

test('retry handles transient errors', async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error('Timeout');
    return 'success';
  };
  
  const result = await withRetry(operation, 3);
  expect(result).toBe('success');
  expect(attempts).toBe(3);
});
```

## Next Tutorial

In **Tutorial 4**, we'll implement the System Prompt - constructing prompts with dynamic sections and caching for performance.

---

## Source Files

- `src/api/factory.ts` - API client factory with retry logic
- `src/api/errors.ts` - Error classification
- `src/types.ts` - Core types
