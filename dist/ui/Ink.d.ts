/**
 * Main Ink class - manages React tree and terminal rendering.
 */
export declare const FRAME_INTERVAL_MS = 16;
export interface InkOptions {
    stdout?: NodeJS.WriteStream;
    stdin?: NodeJS.ReadStream;
    debug?: boolean;
}
export declare class Ink {
    private options;
    private rootNode;
    private container;
    private frontFrame;
    private backFrame;
    private throttleTimer;
    private isRendering;
    constructor(options?: InkOptions);
    render(element: any): void;
    unmount(): void;
    private handleLayout;
    private scheduleRender;
    private deferredRender;
    private performRender;
    private getTerminalDimensions;
    private setupResizeHandler;
}
//# sourceMappingURL=Ink.d.ts.map