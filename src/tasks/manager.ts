/**
 * Task Manager
 * 
 * Central registry and lifecycle management for all tasks.
 */

import {
  TaskState,
  TaskType,
  TaskStatus,
  isTerminalTaskStatus,
  SetAppState
} from './types.js';

/**
 * Manages all task states
 */
export class TaskManager {
  private tasks = new Map<string, TaskState>();

  /**
   * Register a new task
   */
  registerTask(task: TaskState): void {
    this.tasks.set(task.id, task);
  }

  /**
   * Get a task by ID
   */
  getTask(taskId: string): TaskState | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Update specific fields of a task
   */
  updateTask(taskId: string, updates: Partial<TaskState>): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    
    Object.assign(task, updates);
    return true;
  }

  /**
   * Set task status with automatic endTime for terminal states
   */
  setTaskStatus(taskId: string, status: TaskStatus): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    
    task.status = status;
    if (isTerminalTaskStatus(status)) {
      task.endTime = Date.now();
    }
    return true;
  }

  /**
   * Get all running tasks
   */
  getRunningTasks(): TaskState[] {
    return Array.from(this.tasks.values()).filter(
      t => t.status === 'running'
    );
  }

  /**
   * Get tasks by type
   */
  getTasksByType(type: TaskType): TaskState[] {
    return Array.from(this.tasks.values()).filter(t => t.type === type);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): TaskState[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Evict completed tasks after grace period
   */
  evictCompletedTasks(gracePeriodMs: number = 300000): number {
    const now = Date.now();
    let evicted = 0;
    
    for (const [id, task] of this.tasks) {
      if (isTerminalTaskStatus(task.status)) {
        const endTime = task.endTime || now;
        const shouldRetain = 'retain' in task && (task as any).retain;
        
        if (now - endTime > gracePeriodMs && !shouldRetain) {
          this.tasks.delete(id);
          evicted++;
        }
      }
    }
    
    return evicted;
  }

  /**
   * Get count of tasks by status
   */
  getStatusCounts(): Record<TaskStatus | 'total', number> {
    const counts = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      killed: 0,
      total: this.tasks.size
    };
    
    for (const task of this.tasks.values()) {
      counts[task.status]++;
    }
    
    return counts;
  }
}

/**
 * Global task manager instance
 */
export const taskManager = new TaskManager();
