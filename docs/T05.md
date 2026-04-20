# Tutorial 5: The Agent Loop

## What We're Building

The agent loop is the beating heart of Claude Code. It's an async generator that runs every interaction, from the first keystroke to the last tool call. In this tutorial, we'll build a working agent loop with context management, error recovery, and tool execution.

## The Core Concept

An agent is a loop, not a single API call:
1. Call the model
2. Execute any tool calls
3. Feed results back
4. Call the model again
5. Repeat until work is done

## Why an Async Generator?

```typescript
// The agent loop is a generator, not callbacks
async function* agentLoop(params: LoopParams): AsyncGenerator<LoopEvent, TerminalReason>
```

**Three key reasons:**

1. **Backpressure**: Generator yields only when consumer calls `.next()`. If the UI is busy painting, the loop naturally pauses. No buffer overflow.

2. **Return value semantics**: The generator returns a `Terminal` object encoding exactly why the loop stopped - normal completion, user abort, token budget exhausted, etc.

3. **Composability via `yield*`**: Sub-generators can transparently forward values. Clean chain of responsibility without callback hell.

## Implementation

### Step 1: Define the Types

```typescript
// src/agent/types.ts

export interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  tool_call_id: string;
  content: string;
  isError?: boolean;
}

// Why the loop stopped
export type TerminalReason =
  | { reason: 'completed'; message: string }
  | { reason: 'aborted'; message: string }
  | { reason: 'max_turns_reached' }
  | { reason: 'error'; error: string };

// Events yielded during execution
export type LoopEvent =
  | { type: 'assistant_message'; content: string }
  | { type: 'tool_call'; tool: ToolCall }
  | { type: 'tool_result'; result: ToolResult }
  | { type: 'thinking'; content: string };

export interface LoopParams {
  messages: Message[];
  systemPrompt?: string;
  maxTurns?: number;
  apiKey: string;
  model?: string;
}

// State carried through the loop
export interface LoopState {
  messages: Message[];
  turnCount: number;
  maxTurns: number;
}
```

### Step 2: Create the Agent Loop

```typescript
// src/agent/loop.ts

import Anthropic from '@anthropic-ai/sdk';
import { 
  Message, 
  ToolCall, 
  ToolResult, 
  LoopParams, 
  LoopState, 
  LoopEvent, 
  TerminalReason 
} from './types.js';
import { executeTool } from '../tools/executor.js';

/**
 * The Agent Loop - Core of Claude Code
 * 
 * This async generator handles the conversation loop:
 * 1. Send messages to the model
 * 2. Stream the response
 * 3. Execute any tool calls
 * 4. Feed results back
 * 5. Repeat until done
 */
export async function* agentLoop(
  params: LoopParams
): AsyncGenerator<LoopEvent, TerminalReason> {
  // Initialize state
  const state: LoopState = {
    messages: [...params.messages],
    turnCount: 0,
    maxTurns: params.maxTurns ?? 25, // Safety limit
  };

  const anthropic = new Anthropic({
    apiKey: params.apiKey,
  });

  console.log(`🚀 Starting agent loop (max ${state.maxTurns} turns)`);

  // Main loop
  while (state.turnCount < state.maxTurns) {
    state.turnCount++;
    console.log(`\n--- Turn ${state.turnCount}/${state.maxTurns} ---`);

    try {
      // Step 1: Call the model
      const stream = anthropic.messages.stream({
        model: params.model ?? 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: params.systemPrompt,
        messages: state.messages.map(m => ({
          role: m.role === 'tool' ? 'user' : m.role,
          content: m.content,
        })),
        // Define available tools
        tools: [
          {
            name: 'read_file',
            description: 'Read the contents of a file',
            input_schema: {
              type: 'object',
              properties: {
                file_path: { type: 'string' },
              },
              required: ['file_path'],
            },
          },
          {
            name: 'write_file',
            description: 'Write content to a file',
            input_schema: {
              type: 'object',
              properties: {
                file_path: { type: 'string' },
                content: { type: 'string' },
              },
              required: ['file_path', 'content'],
            },
          },
          {
            name: 'execute_command',
            description: 'Execute a shell command',
            input_schema: {
              type: 'object',
              properties: {
                command: { type: 'string' },
                cwd: { type: 'string' },
              },
              required: ['command'],
            },
          },
        ],
      });

      let assistantContent = '';
      const toolCalls: ToolCall[] = [];

      // Step 2: Stream the response
      for await (const event of stream) {
        switch (event.type) {
          case 'content_block_delta':
            if (event.delta.type === 'text_delta') {
              const text = event.delta.text;
              assistantContent += text;
              // Yield for real-time display
              yield { type: 'assistant_message', content: text };
            }
            break;

          case 'content_block_start':
            if (event.content_block.type === 'tool_use') {
              const toolCall: ToolCall = {
                id: event.content_block.id,
                name: event.content_block.name,
                input: event.content_block.input as Record<string, unknown>,
              };
              toolCalls.push(toolCall);
              yield { type: 'tool_call', tool: toolCall };
            }
            break;
        }
      }

      // Add assistant message to history
      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      };
      state.messages.push(assistantMessage);

      // Step 3: Check if we're done (no tool calls)
      if (toolCalls.length === 0) {
        console.log('✅ No tool calls - task complete');
        return { 
          reason: 'completed', 
          message: assistantContent 
        };
      }

      // Step 4: Execute tools and collect results
      console.log(`🔧 Executing ${toolCalls.length} tool(s)...`);
      const toolResults: ToolResult[] = [];

      for (const toolCall of toolCalls) {
        try {
          const result = await executeTool(toolCall);
          toolResults.push(result);
          yield { type: 'tool_result', result };
        } catch (error) {
          const errorResult: ToolResult = {
            tool_call_id: toolCall.id,
            content: `Error: ${(error as Error).message}`,
            isError: true,
          };
          toolResults.push(errorResult);
          yield { type: 'tool_result', result: errorResult };
        }
      }

      // Step 5: Add tool results to conversation
      for (const result of toolResults) {
        state.messages.push({
          role: 'tool',
          content: result.content,
          tool_call_id: result.tool_call_id,
        });
      }

      // Loop continues - feed results back to model
      console.log('🔄 Continuing to next turn...');

    } catch (error) {
      console.error('❌ Error in agent loop:', error);
      return { 
        reason: 'error', 
        error: (error as Error).message 
      };
    }
  }

  // Max turns reached
  return { reason: 'max_turns_reached' };
}
```

### Step 3: Tool Executor

```typescript
// src/tools/executor.ts

import { readFile, writeFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ToolCall, ToolResult } from '../agent/types.js';

const execAsync = promisify(exec);

/**
 * Execute a tool call and return the result
 */
export async function executeTool(toolCall: ToolCall): Promise<ToolResult> {
  const { name, input, id } = toolCall;

  console.log(`  Executing tool: ${name}`);

  try {
    switch (name) {
      case 'read_file': {
        const filePath = input.file_path as string;
        const content = await readFile(filePath, 'utf-8');
        return {
          tool_call_id: id,
          content: content.substring(0, 10000), // Limit result size
        };
      }

      case 'write_file': {
        const filePath = input.file_path as string;
        const content = input.content as string;
        await writeFile(filePath, content, 'utf-8');
        return {
          tool_call_id: id,
          content: `Successfully wrote ${content.length} characters to ${filePath}`,
        };
      }

      case 'execute_command': {
        const command = input.command as string;
        const cwd = input.cwd as string | undefined;
        
        // Security: block dangerous commands
        const dangerous = ['rm -rf /', '> /dev/null', 'curl | bash'];
        if (dangerous.some(d => command.includes(d))) {
          throw new Error('Command blocked for security');
        }

        const { stdout, stderr } = await execAsync(command, { cwd });
        return {
          tool_call_id: id,
          content: stdout || stderr || 'Command executed successfully',
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      tool_call_id: id,
      content: `Error executing ${name}: ${(error as Error).message}`,
      isError: true,
    };
  }
}
```

### Step 4: REPL Integration

```typescript
// src/repl.ts

import { createInterface } from 'readline';
import { agentLoop } from './agent/loop.js';
import { LoopEvent, TerminalReason, Message } from './agent/types.js';

/**
 * Run the interactive REPL with agent loop
 */
export async function runRepl(apiKey: string): Promise<void> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\nYou: ',
  });

  console.log('🤖 Claude Code - Agent Loop Demo\n');
  console.log('Type your message or "exit" to quit.\n');

  const systemPrompt = `You are Claude Code, a helpful coding assistant.
You can read files, write files, and execute commands.
Always explain what you're doing before using tools.`;

  while (true) {
    const userInput = await new Promise<string>((resolve) => {
      rl.question('You: ', resolve);
    });

    if (userInput.toLowerCase() === 'exit') {
      console.log('\n👋 Goodbye!');
      rl.close();
      break;
    }

    if (userInput.trim() === '') continue;

    // Run the agent loop
    const messages: Message[] = [
      { role: 'user', content: userInput }
    ];

    const loop = agentLoop({
      messages,
      systemPrompt,
      apiKey,
      maxTurns: 10,
    });

    console.log('\nAssistant: ');
    
    // Process events from the loop
    let result: IteratorResult<LoopEvent, TerminalReason>;
    do {
      result = await loop.next();
      
      if (!result.done) {
        const event = result.value;
        
        switch (event.type) {
          case 'assistant_message':
            process.stdout.write(event.content);
            break;
          case 'tool_call':
            console.log(`\n[Tool: ${event.tool.name}]`);
            break;
          case 'tool_result':
            if (event.result.isError) {
              console.log(`\n[Error: ${event.result.content.substring(0, 100)}]`);
            }
            break;
        }
      }
    } while (!result.done);

    // Handle terminal reason
    const terminal = result.value;
    console.log('\n');
    
    switch (terminal.reason) {
      case 'completed':
        console.log('✅ Task completed');
        break;
      case 'max_turns_reached':
        console.log('⛔ Max turns reached');
        break;
      case 'error':
        console.log(`❌ Error: ${terminal.error}`);
        break;
    }
  }
}
```

## Key Concepts for Junior Devs

### The Loop Pattern

```
┌─────────────────────────────────────────┐
│  Start                                    │
│  Initialize state                         │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Call Model                               │
│  - Send conversation history              │
│  - Stream response                        │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Has tool calls?                          │
│  No → Done                                │
│  Yes → Execute tools                      │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Execute Tools                            │
│  - Run each tool                          │
│  - Collect results                      │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Add results to history                   │
│  Loop back to Call Model                  │
└─────────────────────────────────────────┘
```

### Why State Management Matters

Every iteration, we reconstruct the full state:

```typescript
// Don't mutate - reconstruct
state = {
  messages: [...state.messages, assistantMessage, ...toolResults],
  turnCount: state.turnCount + 1,
  maxTurns: state.maxTurns,
};

// Not: state.turnCount++
// Not: state.messages.push(...)
```

**Benefits:**
- Self-documenting transitions
- Easy to test
- Prevents partial-update bugs
- Can time-travel for debugging

### Error Handling

The loop has multiple error recovery layers:

1. **Tool-level**: Individual tool failures don't crash the loop
2. **Turn-level**: API errors can trigger recovery
3. **Loop-level**: Max turns prevents infinite loops

### Streaming vs Buffering

```typescript
// Stream for real-time UI updates
for await (const event of stream) {
  if (event.type === 'content_block_delta') {
    yield { type: 'assistant_message', content: event.delta.text };
  }
}

// Don't wait for full response - yield as it arrives
```

## Running the Code

```bash
# Set your API key
export ANTHROPIC_API_KEY=your_key_here

# Run the REPL
npm run build
npm start

# Try: "Create a file called hello.txt with 'Hello World'"
```

## Next Tutorial

In **Tutorial 6**, we'll implement the Tools system - creating a proper tool registry, validation, and execution pipeline.

---

## Source Files

- `src/agent/types.ts` - Type definitions
- `src/agent/loop.ts` - Core agent loop
- `src/tools/executor.ts` - Tool execution
- `src/repl.ts` - REPL integration
