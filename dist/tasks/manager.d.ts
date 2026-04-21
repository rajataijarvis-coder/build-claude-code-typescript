/**
 * Task Manager
 *
 * Central registry and lifecycle management for all tasks.
 */
import { TaskState, TaskType, TaskStatus } from './types.js';
/**
 * Manages all task states
 */
export declare class TaskManager {
    private tasks;
    /**
     * Register a new task
     */
    registerTask(task: TaskState): void;
    /**
     * Get a task by ID
     */
    getTask(taskId: string): TaskState | undefined;
    /**
     * Update specific fields of a task
     */
    updateTask(taskId: string, updates: Partial<TaskState>): boolean;
    /**
     * Set task status with automatic endTime for terminal states
     */
    setTaskStatus(taskId: string, status: TaskStatus): boolean;
    /**
     * Get all running tasks
     */
    getRunningTasks(): TaskState[];
    /**
     * Get tasks by type
     */
    getTasksByType(type: TaskType): TaskState[];
    /**
     * Get all tasks
     */
    getAllTasks(): TaskState[];
    /**
     * Evict completed tasks after grace period
     */
    evictCompletedTasks(gracePeriodMs?: number): number;
    /**
     * Get count of tasks by status
     */
    getStatusCounts(): Record<TaskStatus | 'total', number>;
}
/**
 * Global task manager instance
 */
export declare const taskManager: TaskManager;
//# sourceMappingURL=manager.d.ts.map