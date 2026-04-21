/**
 * Task Message Queue
 *
 * Pending message management for inter-agent communication.
 */
/**
 * Queue a message for a running agent
 * Messages are delivered at tool-round boundaries
 */
export function queuePendingMessage(agentId, message, setAppState) {
    setAppState(prev => {
        // Find the task for this agent
        const taskEntry = Object.entries(prev.tasks).find(([, t]) => t.type === 'local_agent' && t.agentId === agentId);
        if (!taskEntry)
            return prev;
        const [taskId, task] = taskEntry;
        if (task.status !== 'running') {
            return prev;
        }
        const agentTask = task;
        return {
            ...prev,
            tasks: {
                ...prev.tasks,
                [taskId]: {
                    ...agentTask,
                    pendingMessages: [...agentTask.pendingMessages, message]
                }
            }
        };
    });
}
/**
 * Drain all pending messages for a task
 * Called at tool-round boundaries
 */
export function drainPendingMessages(taskId, setAppState) {
    let messages = [];
    setAppState(prev => {
        const task = prev.tasks[taskId];
        if (!task || task.type !== 'local_agent')
            return prev;
        const agentTask = task;
        messages = [...agentTask.pendingMessages];
        if (messages.length === 0)
            return prev;
        return {
            ...prev,
            tasks: {
                ...prev.tasks,
                [taskId]: { ...agentTask, pendingMessages: [] }
            }
        };
    });
    return messages;
}
/**
 * Check if agent has pending messages
 */
export function hasPendingMessages(taskId, appState) {
    const task = appState.tasks[taskId];
    if (!task || task.type !== 'local_agent')
        return false;
    return task.pendingMessages.length > 0;
}
/**
 * Get count of pending messages
 */
export function getPendingMessageCount(taskId, appState) {
    const task = appState.tasks[taskId];
    if (!task || task.type !== 'local_agent')
        return 0;
    return task.pendingMessages.length;
}
//# sourceMappingURL=messages.js.map