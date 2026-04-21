/**
 * DOM factory functions for creating and managing DOM elements.
 */
import { ElementType, DOMElement, TextNode, Styles } from './types.js';
export declare function createElement(type: ElementType, style?: Styles, attributes?: Map<string, unknown>): DOMElement;
export declare function createTextNode(content: string): TextNode;
export declare function appendChild(parent: DOMElement, child: DOMElement | TextNode): void;
export declare function removeChild(parent: DOMElement, child: DOMElement | TextNode): void;
export declare function insertBefore(parent: DOMElement, child: DOMElement | TextNode, beforeChild: DOMElement | TextNode): void;
export declare function markDirty(element: DOMElement): void;
//# sourceMappingURL=factory.d.ts.map