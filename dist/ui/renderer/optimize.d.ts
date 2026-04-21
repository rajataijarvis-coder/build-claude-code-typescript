/**
 * Patch optimization and terminal output.
 */
import { Patch } from './diff.js';
export interface OptimizedPatch {
    type: 'stdout' | 'cursor' | 'clear';
    content: string;
}
export declare function optimizePatches(patches: Patch[]): OptimizedPatch[];
export declare function writeToStdout(patches: OptimizedPatch[]): Promise<void>;
//# sourceMappingURL=optimize.d.ts.map