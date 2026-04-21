/**
 * Task Message Queue
 *
 * Pending message management for inter-agent communication.
 */
import { TaskState, SetAppState } from './types.js';
/**
 * Queue a message for a running agent
 * Messages are delivered at tool-round boundaries
 */
export declare function queuePendingMessage(agentId: string, message: string, setAppState: SetAppState): void;
/**
 * Drain all pending messages for a task
 * Called at tool-round boundaries
 */
export declare function drainPendingMessages(taskId: string, setAppState: SetAppState): string[];
/**
 * Check if agent has pending messages
 */
export declare function hasPendingMessages(taskId: string, appState: {
    tasks: Record<string, TaskState>;
}): boolean;
/**
 * Get count of pending messages
 */
export declare function getPendingMessageCount(taskId: string, appState: {
    tasks: Record<string, TaskState>;
}): number;
//# sourceMappingURL=messages.d.ts.map