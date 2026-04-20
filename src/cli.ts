/**
 * CLI Entry Point
 * 
 * This is where the user first touches the system. It runs in an unconfigured
 * environment - no settings loaded yet, no working directory known.
 */

import { parseArgs, ParsedArgs } from './args.js';
import { main } from './main.js';

/**
 * CLI Entry Point
 * 
 * This is where the user first touches the system. It runs in an unconfigured
 * environment - no settings loaded yet, no working directory known.
 */
async function cli(): Promise<void> {
  try {
    // Parse command-line arguments
    // Supports: --verbose, --model, --cwd, --print (non-interactive)
    const args = parseArgs(process.argv.slice(2));
    
    // Pass control to main orchestrator
    await main(args);
  } catch (error) {
    console.error('Fatal error during startup:', error);
    process.exit(1);
  }
}

// Start the bootstrap sequence
cli();
