/**
 * Argument Parser
 * 
 * Parses command-line arguments for the Claude Code CLI.
 */

export interface ParsedArgs {
  verbose?: boolean;
  model?: string;
  cwd?: string;
  print?: boolean;
  allowedTools?: string[];
}

/**
 * Parse command-line arguments
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {};
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    switch (arg) {
      case '--verbose':
      case '-v':
        args.verbose = true;
        break;
      case '--model':
      case '-m':
        args.model = argv[++i];
        break;
      case '--cwd':
        args.cwd = argv[++i];
        break;
      case '--print':
      case '-p':
        args.print = true;
        break;
      case '--allowedTools':
        args.allowedTools = argv[++i]?.split(',') || [];
        break;
    }
  }
  
  return args;
}
