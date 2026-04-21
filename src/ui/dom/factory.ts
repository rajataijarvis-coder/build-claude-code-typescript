/**
 * DOM factory functions for creating and managing DOM elements.
 */

import { Yoga, ElementType, DOMElement, TextNode, Styles, YogaNode } from './types.js';

export function createElement(
  type: ElementType,
  style: Styles = {},
  attributes: Map<string, unknown> = new Map()
): DOMElement {
  const yogaNode = Yoga.Node.create();
  applyStylesToYoga(yogaNode, style);

  const element: DOMElement = {
    type,
    yogaNode,
    style,
    attributes,
    childNodes: [],
    dirty: true,
    internal: false,
    scrollTop: 0,
    scrollLeft: 0,
    stickyScroll: false,
  };

  if (type === ElementType.TEXT) {
    yogaNode.setMeasureFunc(() => measureTextNode(element));
  }

  return element;
}

export function createTextNode(content: string): TextNode {
  return {
    type: 'text',
    content,
    parentNode: undefined as unknown as DOMElement,
  };
}

export function appendChild(
  parent: DOMElement,
  child: DOMElement | TextNode
): void {
  parent.childNodes.push(child);

  if (child.type !== 'text') {
    parent.yogaNode.insertChild(child.yogaNode);
  } else {
    child.parentNode = parent;
  }

  markDirty(parent);
}

export function removeChild(
  parent: DOMElement,
  child: DOMElement | TextNode
): void {
  const index = parent.childNodes.indexOf(child);
  if (index === -1) return;

  parent.childNodes.splice(index, 1);

  if (child.type !== 'text') {
    parent.yogaNode.removeChild(child.yogaNode);
    Yoga.Node.destroy(child.yogaNode);
  }

  markDirty(parent);
}

export function insertBefore(
  parent: DOMElement,
  child: DOMElement | TextNode,
  beforeChild: DOMElement | TextNode
): void {
  const index = parent.childNodes.indexOf(beforeChild);
  if (index === -1) {
    appendChild(parent, child);
    return;
  }

  parent.childNodes.splice(index, 0, child);

  if (child.type !== 'text') {
    parent.yogaNode.insertChild(child.yogaNode);
  } else {
    child.parentNode = parent;
  }

  markDirty(parent);
}

export function markDirty(element: DOMElement): void {
  let current: DOMElement | undefined = element;

  while (current) {
    if (current.dirty) return;
    current.dirty = true;

    if (current.yogaNode) {
      current.yogaNode.markDirty();
    }

    current = current.parentNode;
  }
}

function applyStylesToYoga(yogaNode: YogaNode, style: Styles): void {
  if (style.display === 'none') {
    yogaNode.setDisplay(Yoga.DISPLAY_NONE);
  } else {
    yogaNode.setDisplay(Yoga.DISPLAY_FLEX);
  }

  if (style.flexDirection) {
    const direction = style.flexDirection === 'row'
      ? Yoga.FLEX_DIRECTION_ROW
      : Yoga.FLEX_DIRECTION_COLUMN;
    yogaNode.setFlexDirection(direction);
  }

  if (style.flexWrap) {
    const wrap = style.flexWrap === 'wrap'
      ? Yoga.WRAP_WRAP
      : Yoga.WRAP_NO_WRAP;
    yogaNode.setFlexWrap(wrap);
  }

  if (style.flexGrow !== undefined) {
    yogaNode.setFlexGrow(style.flexGrow);
  }
  if (style.flexShrink !== undefined) {
    yogaNode.setFlexShrink(style.flexShrink);
  }

  const padding = normalizeSpacing(style.padding);
  yogaNode.setPadding(Yoga.EDGE_TOP, padding.top);
  yogaNode.setPadding(Yoga.EDGE_RIGHT, padding.right);
  yogaNode.setPadding(Yoga.EDGE_BOTTOM, padding.bottom);
  yogaNode.setPadding(Yoga.EDGE_LEFT, padding.left);

  if (typeof style.width === 'number') {
    yogaNode.setWidth(style.width);
  } else if (style.width === '100%') {
    yogaNode.setWidthPercent(100);
  }

  if (typeof style.height === 'number') {
    yogaNode.setHeight(style.height);
  } else if (style.height === '100%') {
    yogaNode.setHeightPercent(100);
  }
}

function normalizeSpacing(
  spacing: number | string | undefined
): { top: number; right: number; bottom: number; left: number } {
  if (spacing === undefined) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  if (typeof spacing === 'number') {
    return { top: spacing, right: spacing, bottom: spacing, left: spacing };
  }

  return { top: 0, right: 0, bottom: 0, left: 0 };
}

function measureTextNode(element: DOMElement): { width: number; height: number } {
  const textNodes = element.childNodes.filter(
    (c): c is TextNode => c.type === 'text'
  );
  const text = textNodes.map((n: TextNode) => n.content).join('');

  if (!text) {
    return { width: 0, height: 1 };
  }

  const maxWidth = element.yogaNode.getComputedWidth();
  const lines = text.split('\n');
  const height = lines.length;
  const width = Math.min(
    Math.max(...lines.map((l: string) => l.length)),
    maxWidth
  );

  return { width, height };
}
