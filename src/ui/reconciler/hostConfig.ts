/**
 * React reconciler bridge.
 * Maps React operations to custom DOM.
 */

import { DOMElement, TextNode, ElementType } from '../dom/types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const reconciler: any = {
  createContainer: (
    rootNode: DOMElement,
    tag: number,
    _hydrationCallbacks: unknown,
    _isStrictMode: boolean,
    _concurrentUpdatesByDefaultOverride: unknown,
    _identifierPrefix: string,
    _onRecoverableError: () => void,
    _transitionCallbacks: unknown
  ) => ({
    rootNode,
    tag,
    current: { stateNode: rootNode },
  }),

  updateContainer: (
    element: unknown,
    container: unknown,
    _parentComponent: unknown,
    _callback: () => void
  ) => {
    // eslint-disable-next-line no-console
    console.log('Reconciler updateContainer called');
  },

  discreteUpdates: <T>(fn: () => T): T => {
    return fn();
  },
};

export const ConcurrentRoot = 1;
