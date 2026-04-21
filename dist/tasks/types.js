/**
 * Task System Types
 *
 * Unified abstraction for all background operations.
 */
/**
 * Guard against interacting with dead tasks
 */
export function isTerminalTaskStatus(status) {
    return status === 'completed' || status === 'failed' || status === 'killed';
}
//# sourceMappingURL=types.js.map