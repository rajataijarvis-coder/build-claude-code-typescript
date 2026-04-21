/**
 * Tool Error Classification
 *
 * Classify tool errors for telemetry without leaking sensitive data.
 */
import { z } from 'zod';
/**
 * Classify tool errors for telemetry
 *
 * Extracts safe strings without raw error messages
 * that might contain sensitive data.
 */
export function classifyToolError(error) {
    // Zod validation errors
    if (error instanceof z.ZodError) {
        return {
            category: 'validation',
            type: 'ZodError',
            safeMessage: 'Input validation failed',
            telemetrySafe: true,
        };
    }
    // Standard Error objects
    if (error instanceof Error) {
        const name = error.name || 'Error';
        const message = error.message || '';
        // Permission errors
        if (name.includes('Permission') ||
            message.toLowerCase().includes('permission') ||
            message.toLowerCase().includes('access denied') ||
            message.toLowerCase().includes('eacces')) {
            return {
                category: 'permission',
                type: 'PermissionDenied',
                safeMessage: 'Permission denied',
                telemetrySafe: true,
            };
        }
        // File not found
        if (message.includes('ENOENT')) {
            return {
                category: 'filesystem',
                type: 'FileNotFound',
                safeMessage: 'File not found',
                errno: 'ENOENT',
                telemetrySafe: true,
            };
        }
        // Permission denied (EPERM)
        if (message.includes('EPERM')) {
            return {
                category: 'filesystem',
                type: 'OperationNotPermitted',
                safeMessage: 'Operation not permitted',
                errno: 'EPERM',
                telemetrySafe: true,
            };
        }
        // Is a directory error
        if (message.includes('EISDIR')) {
            return {
                category: 'filesystem',
                type: 'IsDirectory',
                safeMessage: 'Path is a directory',
                errno: 'EISDIR',
                telemetrySafe: true,
            };
        }
        // Not a directory
        if (message.includes('ENOTDIR')) {
            return {
                category: 'filesystem',
                type: 'NotDirectory',
                safeMessage: 'Not a directory',
                errno: 'ENOTDIR',
                telemetrySafe: true,
            };
        }
        // Timeout errors
        if (name.includes('Timeout') ||
            message.toLowerCase().includes('timeout') ||
            message.includes('ETIMEDOUT')) {
            return {
                category: 'execution',
                type: 'Timeout',
                safeMessage: 'Operation timed out',
                telemetrySafe: true,
            };
        }
        // Abort errors
        if (name.includes('Abort') || message.toLowerCase().includes('aborted')) {
            return {
                category: 'execution',
                type: 'Aborted',
                safeMessage: 'Operation aborted',
                telemetrySafe: true,
            };
        }
        // Network errors
        if (name.includes('Network') ||
            message.includes('ECONNREFUSED') ||
            message.includes('ENOTFOUND') ||
            message.includes('ETIMEDOUT')) {
            return {
                category: 'network',
                type: 'NetworkError',
                safeMessage: 'Network error',
                telemetrySafe: true,
            };
        }
        // Rate limit
        if (message.toLowerCase().includes('rate limit') ||
            message.includes('429') ||
            message.includes('too many requests')) {
            return {
                category: 'api',
                type: 'RateLimit',
                safeMessage: 'Rate limit exceeded',
                telemetrySafe: true,
            };
        }
        // Generic - only use error type, not message
        // In minified builds, constructor.name is mangled
        // We extract from known safe patterns
        const safeTypeName = name.replace(/[^a-zA-Z0-9]/g, '');
        return {
            category: 'unknown',
            type: safeTypeName || 'UnknownError',
            safeMessage: 'Operation failed',
            telemetrySafe: true,
        };
    }
    // Non-Error objects
    if (typeof error === 'string') {
        return {
            category: 'unknown',
            type: 'StringError',
            safeMessage: 'Operation failed',
            telemetrySafe: false,
        };
    }
    return {
        category: 'unknown',
        type: 'Unknown',
        safeMessage: 'Unknown error',
        telemetrySafe: false,
    };
}
//# sourceMappingURL=errors.js.map