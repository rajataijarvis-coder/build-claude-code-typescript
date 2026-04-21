/**
 * Default keybinding configuration.
 */

import { KeybindingBlock } from './types.js';

export const DEFAULT_BINDINGS: KeybindingBlock[] = [
  {
    context: 'Global',
    bindings: {
      'ctrl+c': 'app:interrupt',
      'ctrl+d': 'app:exit',
      'ctrl+l': 'app:redraw',
    },
  },
  {
    context: 'Chat',
    bindings: {
      'return': 'chat:submit',
      'enter': 'chat:submit',
      'escape': 'chat:cancel',
      'ctrl+x ctrl+k': 'chat:killAgents',
      'ctrl+x ctrl+e': 'chat:externalEditor',
      'ctrl+r': 'history:search',
      'up': 'history:previous',
      'down': 'history:next',
      'ctrl+a': 'cursor:moveStart',
      'ctrl+e': 'cursor:moveEnd',
      'ctrl+w': 'text:deleteWord',
      'ctrl+u': 'text:deleteLine',
    },
  },
  {
    context: 'Dialog',
    bindings: {
      'escape': 'chat:cancel',
      'y': 'chat:submit',
      'n': 'chat:cancel',
    },
  },
  {
    context: 'VimNormal',
    bindings: {
      'h': 'cursor:moveLeft',
      'j': 'scroll:down',
      'k': 'scroll:up',
      'l': 'cursor:moveRight',
      'w': 'cursor:moveWordRight',
      'b': 'cursor:moveWordLeft',
      '0': 'cursor:moveStart',
      '$': 'cursor:moveEnd',
      'g': 'scroll:top',
      'shift+g': 'scroll:bottom',
      'ctrl+u': 'scroll:pageUp',
      'ctrl+d': 'scroll:pageDown',
      'i': 'vim:enterMode',
      'a': 'vim:enterMode',
      'o': 'vim:enterMode',
      ':': 'vim:enterMode',
    },
  },
  {
    context: 'VimInsert',
    bindings: {
      'escape': 'vim:enterMode',
      'ctrl+c': 'vim:enterMode',
    },
  },
  {
    context: 'History',
    bindings: {
      'escape': 'chat:cancel',
      'ctrl+c': 'chat:cancel',
      'return': 'chat:submit',
      'enter': 'chat:submit',
      'up': 'history:previous',
      'down': 'history:next',
    },
  },
  {
    context: 'Scroll',
    bindings: {
      'escape': 'chat:cancel',
      'up': 'scroll:up',
      'down': 'scroll:down',
      'pageup': 'scroll:pageUp',
      'pagedown': 'scroll:pageDown',
      'home': 'scroll:top',
      'end': 'scroll:bottom',
    },
  },
];

export const NON_REBINDABLE_KEYS = new Set([
  'ctrl+c',
  'ctrl+d',
  'ctrl+m',
  'ctrl+z',
  'ctrl+\\',
]);

export const MACOS_RESERVED_KEYS = new Set([
  'cmd+c',
  'cmd+v',
  'cmd+x',
  'cmd+q',
  'cmd+w',
  'cmd+tab',
  'cmd+space',
]);
