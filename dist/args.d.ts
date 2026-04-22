/**
 * Argument Parser
 *
 * Parses command-line arguments for the Claude Code CLI.
 */
export interface ParsedArgs {
    verbose?: boolean;
    debug?: boolean;
    model?: string;
    cwd?: string;
    print?: boolean;
    allowedTools?: string[];
}
/**
 * Parse command-line arguments
 */
export declare function parseArgs(argv: string[]): ParsedArgs;
//# sourceMappingURL=args.d.ts.map