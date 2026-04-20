# Tutorial 2: The State System - Two-Tier Architecture

## What We're Building

Claude Code uses a two-tier state architecture:

1. **Bootstrap STATE** - Immutable singletons created at startup
2. **AppState** - Reactive store for conversation history and UI state

This tutorial implements both tiers with proper TypeScript typing.

## Two-Tier State Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Bootstrap STATE                         │
│  (Immutable Singletons - Created at Startup)              │
├─────────────────────────────────────────────────────────────┤
│  • Working Directory (absolute path)                       │
│  • Bun Process Instance                                    │
│  • AbortController (for cancellation)                    │
│  • User Settings (from ~/.claude/settings.json)           │
│  • Static Immutable State                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       AppState                              │
│  (Reactive Store - Changes During Session)                  │
├─────────────────────────────────────────────────────────────┤
│  • Messages Array (conversation history)                    │
│  • Loading State (is agent thinking?)                       │
│  • Current Tool (what's executing now?)                   │
│  • Permission Context (allow/deny rules)                  │
│  • UI State (toasts, notifications)                      │
└─────────────────────────────────────────────────────────────┘
```

## Why Two Tiers?

**Separation of Concerns:**
- Bootstrap state is configuration that never changes
- AppState is conversation state that updates frequently

**Performance:**
- Bootstrap state is referenced, not watched
- AppState uses fine-grained reactivity for UI updates

**Testability:**
- Bootstrap state can be mocked easily
- AppState can be snapshotted and restored

## Implementation

### Tier 1: Bootstrap STATE (state/bootstrap.ts)

```typescript
/**
 * Bootstrap State
 * 
 * Immutable singletons created at startup and never modified.
 * These are passed through the context but don't trigger updates.
 */

import { homedir } from 'os';
import { join } from 'path';
import { readFileSync } from 'fs';

export interface UserSettings {
  version: string;
  theme: 'dark' | 'light';
  autoCompactThreshold: number;
  defaultModel?: string;
  allowedTools?: string[];
  deniedTools?: string[];
}

export interface BootstrapState {
  // Process-level constants
  readonly nodeVersion: string;
  readonly platform: string;
  readonly pid: number;
  
  // Paths (absolute, resolved at startup)
  readonly homeDir: string;
  readonly claudeDir: string;
  readonly workingDir: string;
  readonly transcriptsDir: string;
  
  // Loaded configuration
  readonly settings: UserSettings;
  
  // Cancellation mechanism
  readonly abortController: AbortController;
}

/**
 * Load user settings from ~/.claude/settings.json
 */
function loadSettings(claudeDir: string): UserSettings {
  try {
    const settingsPath = join(claudeDir, 'settings.json');
    const content = readFileSync(settingsPath, 'utf-8');
    return JSON.parse(content) as UserSettings;
  } catch {
    // Return defaults if file doesn't exist or is malformed
    return {
      version: '1.0.0',
      theme: 'dark',
      autoCompactThreshold: 100000,
    };
  }
}

/**
 * Create the immutable bootstrap state
 */
export function createBootstrapState(workingDir: string): BootstrapState {
  const homeDir = homedir();
  const claudeDir = join(homeDir, '.claude');
  
  return {
    // Process info
    nodeVersion: process.version,
    platform: process.platform,
    pid: process.pid,
    
    // Paths
    homeDir,
    claudeDir,
    workingDir,
    transcriptsDir: join(claudeDir, 'transcripts'),
    
    // Configuration
    settings: loadSettings(claudeDir),
    
    // Cancellation
    abortController: new AbortController(),
  };
}
```

### Tier 2: AppState (state/appState.ts)

```typescript
/**
 * AppState - Reactive State Store
 * 
 * Manages conversation history and UI state with update notifications.
 */

import { Message } from '../types.js';

// Simple event emitter for state changes
type Listener = () => void;

export interface AppState {
  // Conversation history
  messages: Message[];
  
  // UI state
  isLoading: boolean;
  currentTool?: string;
  error?: string;
  
  // Permission state
  permissionMode: PermissionMode;
  alwaysAllowRules: PermissionRule[];
  alwaysDenyRules: PermissionRule[];
}

export type PermissionMode = 
  | 'default' 
  | 'acceptEdits' 
  | 'plan' 
  | 'dontAsk' 
  | 'bypassPermissions';

export interface PermissionRule {
  tool: string;
  pattern?: string;  // Optional content pattern
  behavior: 'allow' | 'deny' | 'ask';
}

/**
 * Create reactive state store
 */
export function createAppState(): AppState {
  return {
    messages: [],
    isLoading: false,
    currentTool: undefined,
    error: undefined,
    permissionMode: 'default',
    alwaysAllowRules: [],
    alwaysDenyRules: [],
  };
}

/**
 * State manager with reactivity
 */
export class StateManager {
  private state: AppState;
  private listeners: Set<Listener> = new Set();
  
  constructor() {
    this.state = createAppState();
  }
  
  /**
   * Get current state (readonly)
   */
  getState(): Readonly<AppState> {
    return this.state;
  }
  
  /**
   * Subscribe to state changes
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Notify all listeners
   */
  private notify(): void {
    this.listeners.forEach(listener => listener());
  }
  
  /**
   * Add a message to the conversation
   */
  addMessage(message: Message): void {
    this.state.messages.push(message);
    this.notify();
  }
  
  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.state.isLoading = loading;
    this.notify();
  }
  
  /**
   * Set current tool being executed
   */
  setCurrentTool(tool: string | undefined): void {
    this.state.currentTool = tool;
    this.notify();
  }
  
  /**
   * Set error message
   */
  setError(error: string | undefined): void {
    this.state.error = error;
    this.notify();
  }
  
  /**
   * Clear all messages
   */
  clearMessages(): void {
    this.state.messages = [];
    this.notify();
  }
  
  /**
   * Set permission mode
   */
  setPermissionMode(mode: PermissionMode): void {
    this.state.permissionMode = mode;
    this.notify();
  }
  
  /**
   * Add a permission rule
   */
  addPermissionRule(rule: PermissionRule): void {
    if (rule.behavior === 'allow') {
      this.state.alwaysAllowRules.push(rule);
    } else if (rule.behavior === 'deny') {
      this.state.alwaysDenyRules.push(rule);
    }
    this.notify();
  }
}
```

### Combined Context (state/index.ts)

```typescript
/**
 * State Index - Combines Bootstrap and AppState
 */

import { BootstrapState, createBootstrapState } from './bootstrap.js';
import { AppState, StateManager, PermissionMode } from './appState.js';
import { Message } from '../types.js';

export interface CombinedState {
  // Immutable bootstrap state
  readonly bootstrap: BootstrapState;
  
  // Reactive app state
  readonly app: StateManager;
}

/**
 * Initialize combined state
 */
export function initializeState(workingDir: string): CombinedState {
  return {
    bootstrap: createBootstrapState(workingDir),
    app: new StateManager(),
  };
}

// Re-export types
export { BootstrapState, AppState, StateManager, PermissionMode };
export type { Message };
```

### Types (types.ts)

```typescript
/**
 * Core Types
 */

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
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
```

## Usage Example

```typescript
import { initializeState } from './state/index.js';

// Initialize state at startup
const state = initializeState('/home/user/project');

// Read bootstrap state (always safe, never changes)
console.log(state.bootstrap.workingDir);
console.log(state.bootstrap.settings.theme);

// Subscribe to app state changes
const unsubscribe = state.app.subscribe(() => {
  const current = state.app.getState();
  console.log('Messages:', current.messages.length);
  console.log('Loading:', current.isLoading);
});

// Update app state (triggers subscribers)
state.app.addMessage({
  role: 'user',
  content: 'Hello!'
});

state.app.setLoading(true);

// Unsubscribe when done
unsubscribe();
```

## Key Concepts for Junior Devs

### Why Readonly?

Bootstrap state uses `readonly` to prevent accidental mutation:

```typescript
// ❌ This would be a compile error
state.bootstrap.workingDir = '/other/path';  // Error: read-only property

// ✅ AppState can be modified through methods
state.app.addMessage({ role: 'user', content: 'Hello' });
```

### The Observer Pattern

AppState uses the observer pattern for reactivity:

```
┌─────────────┐     subscribe      ┌─────────────┐
│   UI        │◄────────────────────│  StateManager│
│ Component   │                     │              │
└─────────────┘                     └─────────────┘
       ▲                                   │
       │         notify()                  │
       └───────────────────────────────────┘
                    (state changes)
```

### Immutable vs Mutable

```typescript
// Bootstrap: Immutable (safer, easier to reason about)
const bootstrap = Object.freeze({ workingDir: '/project' });

// AppState: Mutable with controlled updates
const appState = new StateManager();
appState.addMessage(msg);  // Controlled mutation
```

## Testing

```typescript
import { initializeState } from './state/index.js';

test('bootstrap state is immutable', () => {
  const state = initializeState('/test');
  expect(state.bootstrap.workingDir).toBe('/test');
  // TypeScript prevents: state.bootstrap.workingDir = '/other'
});

test('app state notifies subscribers', () => {
  const state = initializeState('/test');
  const listener = jest.fn();
  
  state.app.subscribe(listener);
  state.app.setLoading(true);
  
  expect(listener).toHaveBeenCalled();
  expect(state.app.getState().isLoading).toBe(true);
});
```

## Next Tutorial

In **Tutorial 3**, we'll implement the API Layer - creating a multi-provider client factory for Anthropic's API with proper error handling and retries.

---

## Source Files

- `src/state/bootstrap.ts` - Immutable bootstrap state
- `src/state/appState.ts` - Reactive app state
- `src/state/index.ts` - Combined exports
- `src/types.ts` - Core type definitions
