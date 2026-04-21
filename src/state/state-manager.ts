// src/state/state-manager.ts
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

export class StateManager {
  private state: AppState;

  constructor(private config: Config) {
    this.state = {
      conversation: { messages: [], contextWindow: 0, tokenCount: 0 },
      session: { startTime: new Date(), totalCost: 0, totalTokens: 0 }
    };
  }

  getState(): Readonly<AppState> {
    return { ...this.state };
  }

  addMessage(message: Message): void {
    this.state.conversation.messages.push(message);
  }
}
