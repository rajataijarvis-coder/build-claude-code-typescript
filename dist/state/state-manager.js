export class StateManager {
    config;
    state;
    constructor(config) {
        this.config = config;
        this.state = {
            conversation: { messages: [], contextWindow: 0, tokenCount: 0 },
            session: { startTime: new Date(), totalCost: 0, totalTokens: 0 }
        };
    }
    getState() {
        return { ...this.state };
    }
    addMessage(message) {
        this.state.conversation.messages.push(message);
    }
}
//# sourceMappingURL=state-manager.js.map