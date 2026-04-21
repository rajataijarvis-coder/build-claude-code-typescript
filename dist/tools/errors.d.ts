/**
 * Tool Error Classification
 *
 * Classify tool errors for telemetry without leaking sensitive data.
 */
import { ErrorClassification } from './types.js';
/**
 * Classify tool errors for telemetry
 *
 * Extracts safe strings without raw error messages
 * that might contain sensitive data.
 */
export declare function classifyToolError(error: unknown): ErrorClassification;
//# sourceMappingURL=errors.d.ts.map