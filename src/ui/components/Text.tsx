/**
 * Text component for terminal rendering.
 * Stub implementation without React dependency.
 */

export interface TextProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children?: any;
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  inverse?: boolean;
}

export const Text = ({ children }: TextProps): unknown => {
  return { type: 'ink-text', children };
};
