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
export const DEFAULT_TOOL_BUDGETS: Record<string, ToolBudget> = {
  // Read tool self-bounds via token estimation
  Read: {
    maxResultSizeChars: Infinity,
    maxResultTokens: Infinity,
  },
  // Edit diffs can be large but model needs them
  Edit: {
    maxResultSizeChars: 100_000,
    maxResultTokens: 25_000,
  },
  // Bash output typically moderate
  Bash: {
    maxResultSizeChars: 30_000,
    maxResultTokens: 7_500,
  },
  // Search results with context add up
  Grep: {
    maxResultSizeChars: 100_000,
    maxResultTokens: 25_000,
  },
  // Glob results can be huge in large repos
  Glob: {
    maxResultSizeChars: 50_000,
    maxResultTokens: 12_500,
  },
};

/** Slot reservation configuration */
export interface SlotReservation {
  defaultTokens: number;
  escalationTokens: number;
  escalationThreshold: number;  // truncation rate that triggers escalation
}

/** Default slot reservation: 8K default, 64K escalation */
export const DEFAULT_SLOT_RESERVATION: SlotReservation = {
  defaultTokens: 8_000,
  escalationTokens: 64_000,
  escalationThreshold: 0.01,  // 1% truncation rate
};

/**
 * Budget manager for token and result sizing
 */
export class BudgetManager {
  private state: BudgetState;
  private slotReservation: SlotReservation;
  private truncationCount: number = 0;
  private totalRequests: number = 0;

  constructor(
    customBudgets?: Partial<Record<string, ToolBudget>>,
    slotConfig?: Partial<SlotReservation>
  ) {
    this.state = {
      toolBudgets: new Map(Object.entries({
        ...DEFAULT_TOOL_BUDGETS,
        ...customBudgets,
      })),
      aggregate: {
        maxCharsPerMessage: 200_000,
        maxTokensPerConversation: 500_000,
      },
      currentConversationChars: 0,
      currentConversationTokens: 0,
    };

    this.slotReservation = { ...DEFAULT_SLOT_RESERVATION, ...slotConfig };
  }

  /**
   * Get the appropriate output slot reservation
   * 
   * Default 8K, escalates to 64K on high truncation rate.
   * Production data shows p99 output is 4,911 tokens.
   */
  getOutputSlotReservation(): number {
    const truncationRate = this.totalRequests > 0
      ? this.truncationCount / this.totalRequests
      : 0;

    if (truncationRate > this.slotReservation.escalationThreshold) {
      return this.slotReservation.escalationTokens;
    }

    return this.slotReservation.defaultTokens;
  }

  /**
   * Record a truncation event
   */
  recordTruncation(): void {
    this.truncationCount++;
    this.totalRequests++;
  }

  /**
   * Record successful (non-truncated) completion
   */
  recordSuccess(): void {
    this.totalRequests++;
  }

  /**
   * Get budget for a specific tool
   */
  getToolBudget(toolName: string): ToolBudget {
    return this.state.toolBudgets.get(toolName) ?? {
      maxResultSizeChars: 30_000,
      maxResultTokens: 7_500,
    };
  }

  /**
   * Check if result exceeds tool budget
   */
  exceedsToolBudget(toolName: string, resultChars: number): boolean {
    const budget = this.getToolBudget(toolName);
    return budget.maxResultSizeChars !== Infinity &&
           resultChars > budget.maxResultSizeChars;
  }

  /**
   * Check aggregate conversation budget
   */
  checkAggregateBudget(requestedChars: number): {
    allowed: boolean;
    remaining: number;
  } {
    const remaining = this.state.aggregate.maxCharsPerMessage -
                      this.state.currentConversationChars;
    
    return {
      allowed: requestedChars <= remaining,
      remaining,
    };
  }

  /**
   * Add to conversation usage
   */
  addConversationUsage(chars: number, tokens: number): void {
    this.state.currentConversationChars += chars;
    this.state.currentConversationTokens += tokens;
  }

  /**
   * Persist oversized result to disk
   */
  async persistResult(
    toolName: string,
    result: string,
    persistDir: string
  ): Promise<{ persisted: boolean; path?: string; preview: string }> {
    const budget = this.getToolBudget(toolName);
    
    if (budget.maxResultSizeChars === Infinity ||
        result.length <= budget.maxResultSizeChars) {
      return { persisted: false, preview: result };
    }

    // Create hash for filename
    const crypto = await import('node:crypto');
    const hash = crypto.createHash('sha256').update(result).digest('hex').slice(0, 16);
    const filename = `${toolName.toLowerCase()}_${hash}.txt`;
    const filepath = `${persistDir}/${filename}`;

    // Write full result to disk
    const fs = await import('node:fs/promises');
    await fs.mkdir(persistDir, { recursive: true });
    await fs.writeFile(filepath, result, 'utf-8');

    // Create preview (first 500 chars + indicator)
    const previewLength = 500;
    const preview = result.length > previewLength
      ? result.slice(0, previewLength) + '\n\n... [truncated, full result persisted]'
      : result;

    return {
      persisted: true,
      path: filepath,
      preview,
    };
  }

  /**
   * Get current usage statistics
   */
  getUsageStats(): {
    conversationChars: number;
    conversationTokens: number;
    truncationRate: number;
    currentSlotReservation: number;
  } {
    return {
      conversationChars: this.state.currentConversationChars,
      conversationTokens: this.state.currentConversationTokens,
      truncationRate: this.totalRequests > 0
        ? this.truncationCount / this.totalRequests
        : 0,
      currentSlotReservation: this.getOutputSlotReservation(),
    };
  }

  /**
   * Reset conversation tracking (e.g., after compaction)
   */
  resetConversationTracking(): void {
    this.state.currentConversationChars = 0;
    this.state.currentConversationTokens = 0;
  }
}

/** Global budget manager instance */
export const budgetManager = new BudgetManager();
