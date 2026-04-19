# Tutorial 1: Bootstrap Architecture

## What We're Building

The foundation of our Claude Code clone: a dependency injection container, configuration system, and state management that will power everything else.

## Architecture Pattern: The Bootstrap Pipeline

Claude Code uses a 5-phase initialization:

```
1. Environment Detection → 2. Config Loading → 3. Service Registration → 4. State Initialization → 5. Trust Boundary Setup
```

## Code Implementation

Create `src/bootstrap.ts`:

```typescript
// src/bootstrap.ts
import { Container } from './di/container';
import { Config } from './config/config';
import { StateManager } from './state/state-manager';
import { PermissionSystem } from './permissions/permission-system';
import { Logger } from './utils/logger';

export interface BootstrapResult {
  container: Container;
  config: Config;
  state: StateManager;
  permissions: PermissionSystem;
  logger: Logger;
}

export class Bootstrap {
  private phase: number = 0;
  private container: Container = new Container();

  async initialize(): Promise<BootstrapResult> {
    // Phase 1: Environment Detection
    this.phase = 1;
    const env = this.detectEnvironment();
    this.log(`Environment: ${env}`);

    // Phase 2: Config Loading
    this.phase = 2;
    const config = await this.loadConfig(env);
    this.container.register('config', config);

    // Phase 3: Service Registration
    this.phase = 3;
    const logger = new Logger(config.logLevel);
    this.container.register('logger', logger);
    this.log('Services registered');

    // Phase 4: State Initialization
    this.phase = 4;
    const state = new StateManager(config);
    this.container.register('state', state);

    // Phase 5: Trust Boundary Setup
    this.phase = 5;
    const permissions = new PermissionSystem(config.trustLevel);
    this.container.register('permissions', permissions);

    this.log('Bootstrap complete ✓');
    
    return {
      container: this.container,
      config,
      state,
      permissions,
      logger
    };
  }

  private detectEnvironment(): 'development' | 'production' | 'test' {
    if (process.env.NODE_ENV === 'test') return 'test';
    if (process.env.NODE_ENV === 'production') return 'production';
    return 'development';
  }

  private async loadConfig(env: string): Promise<Config> {
    // Load from file, env vars, or defaults
    const configLoader = new ConfigLoader(env);
    return configLoader.load();
  }

  private log(message: string): void {
    console.log(`[Bootstrap Phase ${this.phase}] ${message}`);
  }
}
```

Create `src/di/container.ts`:

```typescript
// src/di/container.ts
export class Container {
  private services = new Map<string, any>();
  private factories = new Map<string, () => any>();

  register<T>(token: string, instance: T): void {
    this.services.set(token, instance);
  }

  registerFactory<T>(token: string, factory: () => T): void {
    this.factories.set(token, factory);
  }

  get<T>(token: string): T {
    // Return existing instance
    if (this.services.has(token)) {
      return this.services.get(token) as T;
    }

    // Create from factory (lazy initialization)
    if (this.factories.has(token)) {
      const instance = this.factories.get(token)!();
      this.services.set(token, instance);
      return instance as T;
    }

    throw new Error(`Service not found: ${token}`);
  }

  has(token: string): boolean {
    return this.services.has(token) || this.factories.has(token);
  }
}
```

Create `src/config/config.ts`:

```typescript
// src/config/config.ts
export interface Config {
  // API
  apiKey: string;
  apiUrl: string;
  model: string;
  maxTokens: number;
  
  // Trust
  trustLevel: 'strict' | 'normal' | 'permissive';
  requirePermissions: boolean;
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // Features
  enableSubAgents: boolean;
  enableMCP: boolean;
  enableMemory: boolean;
}

export class ConfigLoader {
  constructor(private env: string) {}

  async load(): Promise<Config> {
    // Start with defaults
    const config: Config = {
      apiKey: process.env.CLAUDE_API_KEY || '',
      apiUrl: 'https://api.anthropic.com/v1',
      model: 'claude-3-sonnet-20240229',
      maxTokens: 8192,
      trustLevel: 'normal',
      requirePermissions: true,
      logLevel: 'info',
      enableSubAgents: true,
      enableMCP: true,
      enableMemory: true
    };

    // Override from config file if exists
    try {
      const fileConfig = await this.loadFromFile();
      Object.assign(config, fileConfig);
    } catch {
      // No config file, use defaults
    }

    // Environment overrides
    if (process.env.CLAUDE_MODEL) config.model = process.env.CLAUDE_MODEL;
    if (process.env.CLAUDE_LOG_LEVEL) config.logLevel = process.env.CLAUDE_LOG_LEVEL as Config['logLevel'];

    return config;
  }

  private async loadFromFile(): Promise<Partial<Config>> {
    // Would load from .claude-code/config.json
    return {};
  }
}
```

Create `src/state/state-manager.ts`:

```typescript
// src/state/state-manager.ts
import { Config } from '../config/config';

export interface AppState {
  conversation: {
    messages: Message[];
    contextWindow: number;
    tokenCount: number;
  };
  session: {
    startTime: Date;
    totalCost: number;
    totalTokens: number;
  };
  permissions: {
    granted: Set<string>;
    denied: Set<string>;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class StateManager {
  private state: AppState;

  constructor(private config: Config) {
    this.state = this.initializeState();
  }

  private initializeState(): AppState {
    return {
      conversation: {
        messages: [],
        contextWindow: 0,
        tokenCount: 0
      },
      session: {
        startTime: new Date(),
        totalCost: 0,
        totalTokens: 0
      },
      permissions: {
        granted: new Set(),
        denied: new Set()
      }
    };
  }

  // State accessors
  getState(): Readonly<AppState> {
    return Object.freeze({ ...this.state });
  }

  getConversation(): Readonly<AppState['conversation']> {
    return Object.freeze({ ...this.state.conversation });
  }

  // State mutations
  addMessage(message: Message): void {
    this.state.conversation.messages.push(message);
    this.updateTokenCount();
  }

  updateCost(cost: number): void {
    this.state.session.totalCost += cost;
  }

  grantPermission(permission: string): void {
    this.state.permissions.granted.add(permission);
    this.state.permissions.denied.delete(permission);
  }

  denyPermission(permission: string): void {
    this.state.permissions.denied.add(permission);
    this.state.permissions.granted.delete(permission);
  }

  hasPermission(permission: string): boolean {
    return this.state.permissions.granted.has(permission);
  }

  private updateTokenCount(): void {
    // Approximate token counting
    this.state.conversation.tokenCount = this.state.conversation.messages
      .reduce((acc, msg) => acc + Math.ceil(msg.content.length / 4), 0);
  }
}
```

## Entry Point

Create `src/index.ts`:

```typescript
// src/index.ts
import { Bootstrap } from './bootstrap';

async function main() {
  console.log('🚀 Starting Claude Code TypeScript...\n');
  
  const bootstrap = new Bootstrap();
  const { config, state, logger } = await bootstrap.initialize();
  
  logger.info('Agent initialized');
  logger.info(`Model: ${config.model}`);
  logger.info(`Trust Level: ${config.trustLevel}`);
  
  // Add initial system message
  state.addMessage({
    id: 'system-1',
    role: 'system',
    content: 'You are Claude Code, an AI coding assistant.',
    timestamp: new Date()
  });
  
  console.log('\n✓ Ready for commands');
}

main().catch(console.error);
```

## Running It

```bash
npm init -y
npm install typescript ts-node @types/node
npx tsc --init

# Run
npx ts-node src/index.ts
```

## What We Learned

1. **5-Phase Bootstrap** - Clean separation of concerns during initialization
2. **DI Container** - Dependency injection for testability and modularity
3. **Two-Tier State** - Bootstrap state (immutable) + AppState (mutable)
4. **Trust Boundary** - Security decisions made at startup, frozen after

## Next Tutorial

We'll build the API layer for talking to Claude - multi-provider support, streaming, and error recovery.

## Git Commit

```bash
git add .
git commit -m "T1: Bootstrap architecture - DI container, config, state manager"
```
