/**
 * Main Orchestrator
 * 
 * Validates prerequisites and delegates to the appropriate handler.
 * This is the first place where we check if the system can actually run.
 */

import { init, AppContext } from './init.js';
import { setup } from './setup.js';
import { launchRepl } from './replLauncher.js';
import { ParsedArgs } from './args.js';

/**
 * Main Entry Point
 * 
 * Validates prerequisites and delegates to the appropriate handler.
 * This is the first place where we check if the system can actually run.
 */
export async function main(args: ParsedArgs): Promise<void> {
  console.log('🚀 Starting Claude Code...');
  
  // Validate prerequisites
  if (!await checkPrerequisites()) {
    throw new Error('Prerequisites check failed');
  }
  
  // Step 1: Initialize singletons
  const context = await init(args);
  
  // Step 2: One-time setup (creates ~/.claude/ if needed)
  await setup(context);
  
  // Step 3: Launch appropriate interface
  if (args.print) {
    // Non-interactive mode: process single prompt and exit
    await runNonInteractive(context, args);
  } else {
    // Interactive REPL mode
    await launchRepl(context);
  }
}

async function checkPrerequisites(): Promise<boolean> {
  // Check Node.js version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (major < 18) {
    console.error('❌ Node.js 18+ required, found:', nodeVersion);
    return false;
  }
  
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY environment variable required');
    console.error('   Set it with: export ANTHROPIC_API_KEY=your_key_here');
    return false;
  }
  
  console.log('  ✅ Prerequisites check passed');
  return true;
}

async function runNonInteractive(context: AppContext, args: ParsedArgs): Promise<void> {
  // Single-shot execution mode
  console.log('Non-interactive mode not yet implemented');
  console.log('Arguments:', args);
}
