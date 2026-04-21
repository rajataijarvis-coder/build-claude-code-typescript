// src/bootstrap.ts
import { Container } from './di/container.js';
import { Config, ConfigLoader } from './config/config.js';
import { StateManager } from './state/state-manager.js';
import { Logger } from './utils/logger.js';

export interface BootstrapResult {
  container: Container;
  config: Config;
  state: StateManager;
  logger: Logger;
}

export class Bootstrap {
  private phase: number = 0;
  private container: Container = new Container();

  async initialize(): Promise<BootstrapResult> {
    this.phase = 1;
    const env = this.detectEnvironment();
    
    this.phase = 2;
    const config = await new ConfigLoader(env).load();
    this.container.register('config', config);
    
    this.phase = 3;
    const logger = new Logger(config.logLevel);
    this.container.register('logger', logger);
    
    this.phase = 4;
    const state = new StateManager(config);
    this.container.register('state', state);
    
    this.log('Bootstrap complete ✓');
    
    return { container: this.container, config, state, logger };
  }

  private detectEnvironment(): string {
    return process.env.NODE_ENV || 'development';
  }

  private log(message: string): void {
    console.log(`[Bootstrap Phase ${this.phase}] ${message}`);
  }
}
