/**
 * Agent Loop - Core Implementation with Concurrent Execution
 *
 * The async generator that runs every interaction.
 * Now uses speculative execution and partition-based tool orchestration.
 */
import { LoopParams, LoopEvent, TerminalReason } from './types.js';
/**
 * The Agent Loop with Concurrent Execution
 *
 * Supports two modes:
 * 1. Streaming mode: Uses StreamingToolExecutor for speculative execution
 * 2. Batch mode: Uses partition-based orchestrator for pre-known tool sets
 */
export declare function agentLoop(params: LoopParams, useStreaming?: boolean): AsyncGenerator<LoopEvent, TerminalReason>;
//# sourceMappingURL=loop.d.ts.map