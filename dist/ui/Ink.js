/**
 * Main Ink class - manages React tree and terminal rendering.
 */
import { createElement } from './dom/factory.js';
import { ElementType } from './dom/types.js';
import { Frame } from './renderer/Frame.js';
import { reconciler, ConcurrentRoot } from './reconciler/hostConfig.js';
export const FRAME_INTERVAL_MS = 16;
export class Ink {
    options;
    rootNode;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    container;
    frontFrame;
    backFrame;
    throttleTimer = null;
    isRendering = false;
    constructor(options = {}) {
        this.options = options;
        this.rootNode = createElement(ElementType.ROOT, {});
        this.rootNode.internal = true;
        const dimensions = this.getTerminalDimensions();
        this.frontFrame = new Frame(dimensions);
        this.backFrame = new Frame(dimensions);
        this.container = reconciler.createContainer(this.rootNode, ConcurrentRoot, null, false, null, 'Ink', () => { }, null);
        this.rootNode.onComputeLayout = () => this.handleLayout();
        this.rootNode.onRender = () => this.scheduleRender();
        this.setupResizeHandler();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(element) {
        reconciler.updateContainer(element, this.container, null, () => { });
    }
    unmount() {
        reconciler.updateContainer(null, this.container, null, () => { });
    }
    handleLayout() {
        // Layout computed during render pipeline
    }
    scheduleRender() {
        if (this.throttleTimer) {
            clearTimeout(this.throttleTimer);
        }
        this.throttleTimer = setTimeout(() => {
            this.deferredRender();
        }, FRAME_INTERVAL_MS);
    }
    deferredRender() {
        queueMicrotask(() => this.performRender());
    }
    async performRender() {
        if (this.isRendering)
            return;
        this.isRendering = true;
        try {
            this.rootNode.yogaNode.calculateLayout(this.frontFrame.dimensions.columns, this.frontFrame.dimensions.rows, 0);
            Frame.swap(this.frontFrame, this.backFrame);
            if (this.options.debug) {
                // eslint-disable-next-line no-console
                console.error('Frame rendered');
            }
        }
        finally {
            this.isRendering = false;
        }
    }
    getTerminalDimensions() {
        const stdout = this.options.stdout ?? process.stdout;
        return {
            columns: stdout.columns ?? 80,
            rows: stdout.rows ?? 24,
        };
    }
    setupResizeHandler() {
        const stdout = this.options.stdout ?? process.stdout;
        stdout.on('resize', () => {
            const newDimensions = this.getTerminalDimensions();
            this.rootNode.yogaNode.setWidth(newDimensions.columns);
            this.rootNode.yogaNode.setHeight(newDimensions.rows);
            this.frontFrame = new Frame(newDimensions);
            this.backFrame = new Frame(newDimensions);
            this.scheduleRender();
        });
    }
}
//# sourceMappingURL=Ink.js.map