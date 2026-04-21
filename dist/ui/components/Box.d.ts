/**
 * Box component - flexbox container for terminal.
 * Stub implementation without React dependency.
 */
export interface BoxProps {
    children?: any;
    flexDirection?: 'row' | 'column';
    flexWrap?: 'wrap' | 'nowrap';
    flexGrow?: number;
    flexShrink?: number;
    flexBasis?: number | string;
    alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
    justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
    padding?: number | string;
    margin?: number | string;
    width?: number | string;
    height?: number | string;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
}
export declare const Box: ({ children }: BoxProps) => unknown;
//# sourceMappingURL=Box.d.ts.map