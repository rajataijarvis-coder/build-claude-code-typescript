// src/bootstrap.ts
import { Container } from './di/container.js';
import { ConfigLoader } from './config/config.js';
import { StateManager } from './state/state-manager.js';
import { Logger } from './utils/logger.js';
export class Bootstrap {
    phase = 0;
    container = new Container();
    async initialize() {
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
    detectEnvironment() {
        return process.env.NODE_ENV || 'development';
    }
    log(message) {
        console.log(`[Bootstrap Phase ${this.phase}] ${message}`);
    }
}
//# sourceMappingURL=bootstrap.js.map