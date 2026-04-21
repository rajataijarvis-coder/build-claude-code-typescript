/**
 * Cell-level diffing between screens.
 */
import { Screen } from '../screen/Screen.js';
export interface Patch {
    type: 'stdout';
    row: number;
    startCol: number;
    endCol: number;
    content: string;
}
export declare function diffScreens(prev: Screen | null, current: Screen): Patch[];
//# sourceMappingURL=diff.d.ts.map