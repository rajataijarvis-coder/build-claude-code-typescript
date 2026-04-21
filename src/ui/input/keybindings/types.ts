/**
 * Keybinding types and interfaces.
 */

/**
 * Action names for all possible keybindings.
 */
export type ActionName =
  | 'app:interrupt'
  | 'app:exit'
  | 'app:redraw'
  | 'chat:submit'
  | 'chat:cancel'
  | 'chat:killAgents'
  | 'chat:externalEditor'
  | 'history:search'
  | 'history:previous'
  | 'history:next'
  | 'cursor:moveLeft'
  | 'cursor:moveRight'
  | 'cursor:moveWordLeft'
  | 'cursor:moveWordRight'
  | 'cursor:moveStart'
  | 'cursor:moveEnd'
  | 'text:deleteChar'
  | 'text:deleteWord'
  | 'text:deleteLine'
  | 'text:paste'
  | 'vim:enterMode'
  | 'scroll:up'
  | 'scroll:down'
  | 'scroll:pageUp'
  | 'scroll:pageDown'
  | 'scroll:top'
  | 'scroll:bottom';

/**
 * Contexts for keybinding resolution.
 */
export type KeybindingContext =
  | 'Global'
  | 'Chat'
  | 'Dialog'
  | 'VimNormal'
  | 'VimInsert'
  | 'History'
  | 'Scroll';

/**
 * Single keybinding definition.
 */
export interface Keybinding {
  key: string;
  action: ActionName | null;
  when?: string;
}

/**
 * Block of bindings for a specific context.
 */
export interface KeybindingBlock {
  context: KeybindingContext;
  bindings: Record<string, ActionName | null>;
}

/**
 * Full keybinding configuration.
 */
export interface KeybindingConfig {
  version: number;
  bindings: KeybindingBlock[];
}

/**
 * Parsed key chord (single key or multi-key sequence).
 */
export interface KeyChord {
  keys: string[];
}

/**
 * Result of keybinding resolution.
 */
export type ResolutionResult =
  | { type: 'match'; action: ActionName }
  | { type: 'chord_started'; pending: string[] }
  | { type: 'chord_cancelled' }
  | { type: 'unbound' }
  | { type: 'none' };
