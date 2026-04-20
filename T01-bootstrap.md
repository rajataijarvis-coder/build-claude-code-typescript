# Tutorial 1: Bootstrap Architecture

## What We're Building

Claude Code starts with a fast bootstrap sequence that brings the system online in 10-12 seconds. We'll implement this startup pipeline in TypeScript.

## The 5-Step Bootstrap Pipeline

```
cli.tsx → main.tsx → init.ts → setup.ts → replLauncher.ts
```

Each step has a single responsibility:

1. **cli.tsx** - Parse command-line arguments
2. **main.tsx** - Validate prerequisites and delegate
3. **init.ts** - Create the Bun process singletons
4. **setup.ts** - One-time directory and git setup
5. **replLauncher.ts** - Start the interactive REPL

## Implementation

### Step 1: CLI Entry Point (cli.ts)

The CLI is the front door. It parses arguments and hands off to main.

```typescript
// src/cli.ts
import { parseArgs } from './args';
import { main } from './main';

/**
 * CLI Entry Point
 * 
 * This is where the user first touches the system. It runs in an unconfigured
 * environment - no settings loaded yet, no working directory known.
 */
async function cli(): Promise<void> {
  try {
    // Parse command-line arguments
    // Supports: --verbose, --model, --cwd, --print (non-interactive)
    const args = parseArgs(process.argv.slice(2));
    
    // Pass control to main orchestrator
    await main(args);
  } catch (error) {
    console.error('Fatal error during startup:', error);
    process.exit(1);
  }
}

// Start the bootstrap sequence
cli();
```

### Step 2: Main Orchestrator (main.ts)

Main validates prerequisites and decides which execution path to take.

```typescript
// src/main.ts
import { init } from './init';
import { setup } from './setup';
import { launchRepl } from './replLauncher';

export interface CliArgs {
  verbose?: boolean;
  model?: string;
  cwd?: string;
  print?: boolean;      // Non-interactive mode
  allowedTools?: string[];
}

/**
 * Main Entry Point
 * 
 * Validates prerequisites and delegates to the appropriate handler.
 * This is the first place where we check if the system can actually run.
 */
export async function main(args: CliArgs): Promise<void> {
  console.log('🚀 Starting Claude Code...');
  
  // Validate prerequisites
  if (!await checkPrerequisites()) {
    throw new Error('Prerequisites check failed');
  }
  
  // Step 1: Initialize singletons
  const context = await init(args);
  
  // Step 2: One-time setup (creates ~/.claude/ if needed)
  await setup(context);
  
  // Step 3: Launch appropriate interface
  if (args.print) {
    // Non-interactive mode: process single prompt and exit
    await runNonInteractive(context);
  } else {
    // Interactive REPL mode
    await launchRepl(context);
  }
}

async function checkPrerequisites(): Promise<boolean> {
  // Check Node.js version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (major < 18) {
    console.error('Node.js 18+ required');
    return false;
  }
  
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY environment variable required');
    return false;
  }
  
  return true;
}

async function runNonInteractive(context: AppContext): Promise<void> {
  // Single-shot execution mode
  console.log('Non-interactive mode not yet implemented');
}
```

### Step 3: Initialization (init.ts)

Init creates the singleton objects that persist for the session lifetime.

```typescript
// src/init.ts
import { createState } from './state';
import { createAbortController } from './utils/abort';

export interface AppContext {
  state: AppState;
  abortController: AbortController;
  workingDir: string;
  startTime: number;
}

export interface AppState {
  messages: Message[];
  isLoading: boolean;
  currentTool?: string;
  // Will expand in later tutorials
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Initialize Singletons
 * 
 * Creates the long-lived objects that persist for the entire session:
 * - AppState (reactive state store)
 * - AbortController (for cancellation)
 * - Working directory
 */
export async function init(args: CliArgs): Promise<AppContext> {
  console.log('  📦 Initializing state...');
  
  // Create reactive state store
  const state = createState();
  
  // Create abort controller for cancellation support
  const abortController = createAbortController();
  
  // Determine working directory
  const workingDir = args.cwd || process.cwd();
  process.chdir(workingDir);
  
  return {
    state,
    abortController,
    workingDir,
    startTime: Date.now(),
  };
}
```

### Step 4: Setup (setup.ts)

Setup performs one-time initialization of the `~/.claude/` directory.

```typescript
// src/setup.ts
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CLAUDE_DIR = join(homedir(), '.claude');

/**
 * One-Time Setup
 * 
 * Creates the ~/.claude/ directory structure if it doesn't exist.
 * This runs once per machine, not once per session.
 */
export async function setup(context: AppContext): Promise<void> {
  console.log('  🔧 Running setup...');
  
  // Create ~/.claude/ directory
  if (!existsSync(CLAUDE_DIR)) {
    await mkdir(CLAUDE_DIR, { recursive: true });
    console.log(`    Created ${CLAUDE_DIR}`);
  }
  
  // Create settings file if missing
  const settingsPath = join(CLAUDE_DIR, 'settings.json');
  if (!existsSync(settingsPath)) {
    const defaultSettings = {
      version: '1.0.0',
      theme: 'dark',
      autoCompactThreshold: 100000,  // 100k tokens
    };
    await writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2));
    console.log(`    Created ${settingsPath}`);
  }
  
  // Create transcripts directory
  const transcriptsDir = join(CLAUDE_DIR, 'transcripts');
  if (!existsSync(transcriptsDir)) {
    await mkdir(transcriptsDir, { recursive: true });
  }
}
```

### Step 5: REPL Launcher (replLauncher.ts)

Finally, we start the interactive Read-Eval-Print Loop.

```typescript
// src/replLauncher.ts
import { createInterface } from 'readline';
import { queryLoop } from './queryLoop';

/**
 * Launch Interactive REPL
 * 
 * Starts the chat interface where users type messages and Claude responds.
 */
export async function launchRepl(context: AppContext): Promise<void> {
  console.log('\n🤖 Claude Code ready! Type your message or "exit" to quit.\n');
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'You: ',
  });
  
  // Welcome message
  console.log('Assistant: Hello! I\'m Claude Code. How can I help you today?\n');
  
  // Main interaction loop
  while (true) {
    const userInput = await new Promise<string>((resolve) => {
      rl.question('You: ', resolve);
    });
    
    if (userInput.toLowerCase() === 'exit') {
      console.log('\nGoodbye! 👋');
      rl.close();
      break;
    }
    
    if (userInput.trim() === '') continue;
    
    // Run the query loop (will implement in Tutorial 5)
    await queryLoop(userInput, context);
  }
}
```

### Utility: Abort Controller (utils/abort.ts)

```typescript
// src/utils/abort.ts

/**
 * Creates an abort controller with proper cleanup handling.
 */
export function createAbortController(): AbortController {
  const controller = new AbortController();
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n\n⚠️ Interrupted by user');
    controller.abort('user_interrupt');
    process.exit(0);
  });
  
  return controller;
}
```

### Utility: Argument Parser (args.ts)

```typescript
// src/args.ts

export interface ParsedArgs {
  verbose?: boolean;
  model?: string;
  cwd?: string;
  print?: boolean;
  allowedTools?: string[];
}

/**
 * Parse command-line arguments
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {};
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    switch (arg) {
      case '--verbose':
        args.verbose = true;
        break;
      case '--model':
        args.model = argv[++i];
        break;
      case '--cwd':
        args.cwd = argv[++i];
        break;
      case '--print':
        args.print = true;
        break;
      case '--allowedTools':
        args.allowedTools = argv[++i]?.split(',') || [];
        break;
    }
  }
  
  return args;
}
```

### State Factory (state.ts)

```typescript
// src/state.ts
import { AppState, Message } from './init';

/**
 * Create reactive state store
 * 
 * Simple implementation - will expand with actual reactivity in later tutorials
 */
export function createState(): AppState {
  return {
    messages: [],
    isLoading: false,
  };
}

/**
 * Add a message to the conversation history
 */
export function addMessage(state: AppState, message: Message): void {
  state.messages.push(message);
}

/**
 * Get all messages in the conversation
 */
export function getMessages(state: AppState): readonly Message[] {
  return state.messages;
}
```

### Placeholder Query Loop (queryLoop.ts)

```typescript
// src/queryLoop.ts
import { AppContext } from './init';

/**
 * Query Loop - Stub for Tutorial 5
 */
export async function queryLoop(userInput: string, context: AppContext): Promise<void> {
  console.log('Assistant: I received your message. The full query loop will be implemented in Tutorial 5.');
  console.log(`         You said: "${userInput}"\n`);
}
```

## Project Structure

```
src/
├── cli.ts              # Entry point
├── main.ts             # Main orchestrator
├── init.ts             # Initialize singletons
├── setup.ts            # One-time setup
├── replLauncher.ts     # Interactive REPL
├── queryLoop.ts        # Stub for Tutorial 5
├── state.ts            # State management
├── args.ts             # Argument parser
└── utils/
    └── abort.ts        # Abort controller
```

## Key Concepts for Junior Devs

### Why This Pipeline?

**Separation of Concerns**: Each file does one thing well.

**Fail Fast**: Validation happens early (prerequisites check).

**Lazy Loading**: Heavy dependencies aren't loaded until needed.

**Singleton Pattern**: State and controllers are created once and shared.

### The Bootstrap Trade-off

The bootstrap pipeline balances:
- **Speed** - Critical path is <12 seconds
- **Validation** - Checks prerequisites before heavy work
- **Separation** - Each phase is independent and testable

### What Happens on Subsequent Runs?

After the first run, `setup.ts` finds `~/.claude/` already exists and skips most work. The critical path becomes:
```
cli → main → init → replLauncher (no setup needed!)
```

## Running the Code

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Run Claude Code
npm start

# Or with arguments
npm start -- --verbose --model claude-sonnet-4
```

## Next Tutorial

In **Tutorial 2**, we'll implement the State system - the two-tier architecture of Bootstrap STATE singleton and AppState reactive store.

---

## Source Files

All the code above is available in the `src/` directory of this project.
