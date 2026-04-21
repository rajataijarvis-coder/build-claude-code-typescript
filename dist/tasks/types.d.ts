/**
 * Task System Types
 *
 * Unified abstraction for all background operations.
 */
import type { AgentDefinition } from '../agents/types.js';
/**
 * Seven task types representing different execution models
 *
 * Prefixes for visual identification:
 * - b: local_bash (shell commands)
 * - a: local_agent (sub-agents)
 * - r: remote_agent (remote sessions)
 * - t: in_process_teammate (swarm)
 * - w: local_workflow (scripts)
 * - m: monitor_mcp (MCP health)
 * - d: dream (speculative thinking)
 */
export type TaskType = 'local_bash' | 'local_agent' | 'remote_agent' | 'in_process_teammate' | 'local_workflow' | 'monitor_mcp' | 'dream';
/**
 * Task lifecycle statuses
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'killed';
/**
 * Guard against interacting with dead tasks
 */
export declare function isTerminalTaskStatus(status: TaskStatus): boolean;
/**
 * Base fields shared by all task types
 */
export type TaskStateBase = {
    id: string;
    type: TaskType;
    status: TaskStatus;
    description: string;
    toolUseId?: string;
    startTime: number;
    endTime?: number;
    totalPausedMs?: number;
    outputFile: string;
    outputOffset: number;
    notified: boolean;
};
/**
 * Tool activity for progress tracking
 */
export type ToolActivity = {
    tool: string;
    description: string;
    timestamp: number;
};
/**
 * Progress tracker for background agents
 */
export type AgentProgress = {
    toolUseCount: number;
    latestInputTokens: number;
    cumulativeOutputTokens: number;
    recentActivities: ToolActivity[];
};
/**
 * Local agent task state - most complex variant
 */
export type LocalAgentTaskState = TaskStateBase & {
    type: 'local_agent';
    agentId: string;
    prompt: string;
    selectedAgent?: AgentDefinition;
    agentType: string;
    model?: string;
    abortController?: AbortController;
    pendingMessages: string[];
    isBackgrounded: boolean;
    retain: boolean;
    diskLoaded: boolean;
    evictAfter?: number;
    progress?: AgentProgress;
    lastReportedToolCount: number;
    lastReportedTokenCount: number;
};
/**
 * Shell task state
 */
export type LocalShellTaskState = TaskStateBase & {
    type: 'local_bash';
    command: string;
    cwd: string;
    env?: Record<string, string>;
    processId?: number;
};
/**
 * Remote agent task state
 */
export type RemoteAgentTaskState = TaskStateBase & {
    type: 'remote_agent';
    sessionId: string;
    remoteHost: string;
};
/**
 * In-process teammate state
 */
export type TeammateIdentity = {
    id: string;
    name: string;
    color?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';
    role?: 'leader' | 'worker' | 'reviewer';
};
export type InProcessTeammateTaskState = TaskStateBase & {
    type: 'in_process_teammate';
    identity: TeammateIdentity;
    prompt: string;
    messages?: {
        role: string;
        content: string;
    }[];
    pendingUserMessages: string[];
    isIdle: boolean;
    shutdownRequested: boolean;
    awaitingPlanApproval: boolean;
    permissionMode: 'auto' | 'confirm' | 'bypass';
    onIdleCallbacks?: Array<() => void>;
    currentWorkAbortController?: AbortController;
};
/**
 * Dream task state (speculative background thinking)
 */
export type DreamTaskState = TaskStateBase & {
    type: 'dream';
    thoughtTopic: string;
    parentAgentId: string;
};
/**
 * Union of all task states
 */
export type TaskState = LocalAgentTaskState | LocalShellTaskState | RemoteAgentTaskState | InProcessTeammateTaskState | DreamTaskState;
/**
 * Task interface - minimal polymorphic operations
 */
export interface Task {
    name: string;
    type: TaskType;
    kill(taskId: string, setAppState: SetAppState): Promise<void>;
}
/**
 * State setter type
 */
export type SetAppState = (updater: (prev: AppState) => AppState) => void;
/**
 * AppState with tasks
 */
export interface AppState {
    tasks: Record<string, TaskState>;
    agentNameRegistry: Map<string, string>;
    teamContext?: TeamContext;
}
/**
 * Team context for swarm
 */
export interface TeamContext {
    teamName: string;
    teammates: Map<string, TeammateIdentity>;
    leaderId?: string;
    scratchpadDir?: string;
}
/**
 * Task notification format
 */
export interface TaskNotification {
    taskId: string;
    toolUseId?: string;
    outputFile: string;
    status: 'completed' | 'failed' | 'killed';
    summary: string;
    result: string;
    usage: {
        totalTokens: number;
        toolUses: number;
        durationMs: number;
    };
}
/**
 * Task output entry
 */
export interface TaskOutput {
    timestamp: number;
    type: 'message' | 'tool_use' | 'tool_result' | 'completion';
    content: unknown;
}
//# sourceMappingURL=types.d.ts.map