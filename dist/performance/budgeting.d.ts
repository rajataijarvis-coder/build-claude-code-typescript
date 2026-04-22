/**
 * Token and Result Budgeting
 *
 * Manages context window utilization through intelligent
 * slot reservation and result sizing.
 */
/** Budget configuration for a tool */
export interface ToolBudget {
    maxResultSizeChars: number;
    maxResultTokens: number;
}
/** Aggregate budget tracking */
export interface AggregateBudget {
    maxCharsPerMessage: number;
    maxTokensPerConversation: number;
}
/** Budget manager state */
export interface BudgetState {
    toolBudgets: Map<string, ToolBudget>;
    aggregate: AggregateBudget;
    currentConversationChars: number;
    currentConversationTokens: number;
}
/** Default tool budgets based on tool type */
export declare const DEFAULT_TOOL_BUDGETS: Record<string, ToolBudget>;
/** Slot reservation configuration */
export interface SlotReservation {
    defaultTokens: number;
    escalationTokens: number;
    escalationThreshold: number;
}
/** Default slot reservation: 8K default, 64K escalation */
export declare const DEFAULT_SLOT_RESERVATION: SlotReservation;
/**
 * Budget manager for token and result sizing
 */
export declare class BudgetManager {
    private state;
    private slotReservation;
    private truncationCount;
    private totalRequests;
    constructor(customBudgets?: Partial<Record<string, ToolBudget>>, slotConfig?: Partial<SlotReservation>);
    /**
     * Get the appropriate output slot reservation
     *
     * Default 8K, escalates to 64K on high truncation rate.
     * Production data shows p99 output is 4,911 tokens.
     */
    getOutputSlotReservation(): number;
    /**
     * Record a truncation event
     */
    recordTruncation(): void;
    /**
     * Record successful (non-truncated) completion
     */
    recordSuccess(): void;
    /**
     * Get budget for a specific tool
     */
    getToolBudget(toolName: string): ToolBudget;
    /**
     * Check if result exceeds tool budget
     */
    exceedsToolBudget(toolName: string, resultChars: number): boolean;
    /**
     * Check aggregate conversation budget
     */
    checkAggregateBudget(requestedChars: number): {
        allowed: boolean;
        remaining: number;
    };
    /**
     * Add to conversation usage
     */
    addConversationUsage(chars: number, tokens: number): void;
    /**
     * Persist oversized result to disk
     */
    persistResult(toolName: string, result: string, persistDir: string): Promise<{
        persisted: boolean;
        path?: string;
        preview: string;
    }>;
    /**
     * Get current usage statistics
     */
    getUsageStats(): {
        conversationChars: number;
        conversationTokens: number;
        truncationRate: number;
        currentSlotReservation: number;
    };
    /**
     * Reset conversation tracking (e.g., after compaction)
     */
    resetConversationTracking(): void;
}
/** Global budget manager instance */
export declare const budgetManager: BudgetManager;
//# sourceMappingURL=budgeting.d.ts.map