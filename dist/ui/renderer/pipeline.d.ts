/**
 * DOM-to-screen rendering implementation.
 */
import { DOMElement, Styles } from '../dom/types.js';
import { Screen } from '../screen/Screen.js';
export declare const Yoga: any;
export declare function applyStylesToYoga(yogaNode: unknown, style: Styles): void;
export interface RenderPhase {
    name: string;
    durationMs: number;
}
export interface RenderResult {
    phases: RenderPhase[];
}
export declare function renderPipeline(root: DOMElement, prevFrame: {
    screen: Screen;
} | null, dimensions: {
    columns: number;
    rows: number;
}): Promise<RenderResult>;
//# sourceMappingURL=pipeline.d.ts.map