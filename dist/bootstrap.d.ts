import { Container } from './di/container.js';
import { Config } from './config/config.js';
import { StateManager } from './state/state-manager.js';
import { Logger } from './utils/logger.js';
export interface BootstrapResult {
    container: Container;
    config: Config;
    state: StateManager;
    logger: Logger;
}
export declare class Bootstrap {
    private phase;
    private container;
    initialize(): Promise<BootstrapResult>;
    private detectEnvironment;
    private log;
}
//# sourceMappingURL=bootstrap.d.ts.map