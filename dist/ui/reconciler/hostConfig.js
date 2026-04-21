/**
 * React reconciler bridge.
 * Maps React operations to custom DOM.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const reconciler = {
    createContainer: (rootNode, tag, _hydrationCallbacks, _isStrictMode, _concurrentUpdatesByDefaultOverride, _identifierPrefix, _onRecoverableError, _transitionCallbacks) => ({
        rootNode,
        tag,
        current: { stateNode: rootNode },
    }),
    updateContainer: (element, container, _parentComponent, _callback) => {
        // eslint-disable-next-line no-console
        console.log('Reconciler updateContainer called');
    },
    discreteUpdates: (fn) => {
        return fn();
    },
};
export const ConcurrentRoot = 1;
//# sourceMappingURL=hostConfig.js.map