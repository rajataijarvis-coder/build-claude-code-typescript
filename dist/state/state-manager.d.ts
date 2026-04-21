import { Config } from '../config/config.js';
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
}
export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}
export declare class StateManager {
    private config;
    private state;
    constructor(config: Config);
    getState(): Readonly<AppState>;
    addMessage(message: Message): void;
}
//# sourceMappingURL=state-manager.d.ts.map