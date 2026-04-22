/**
 * Main Orchestrator with Performance Optimizations
 * 
 * Validates prerequisites and delegates to the appropriate handler.
 * Includes startup profiling and I/O parallelism.
 */

import { init, AppContext } from './init.js';
import { setup } from './setup.js';
import { launchRepl } from './replLauncher.js';
import { ParsedArgs } from './args.js';
import {
  profileCheckpoint,
  fireAndForget,
  preconnectAPI,
  getSessionStartDate,
} from './performance/index.js';

// Initialize profiler early
profileCheckpoint('main_tsx_entry');

// Fire-and-forget I/O operations during module loading
const apiPreconnect = fireAndForget(
  () => preconnectAPI('https://api.anthropic.com'),
  () => {}  // Best effort, failures are non-fatal
);

/**
 * Main Entry Point
 * 
 * Validates prerequisites and delegates to the appropriate handler.
 * This is the first place where we check if the system can actually run.
 */
export async function main(args: ParsedArgs): Promise<void> {
  profileCheckpoint('main_start');
  
  console.log('🚀 Starting Claude Code...');
  console.log('  📅 Session date:', getSessionStartDate());
  
  // Validate prerequisites
  if (!await checkPrerequisites()) {
    throw new Error('Prerequisites check failed');
  }
  profileCheckpoint('prerequisites_done');
  
  // Step 1: Initialize singletons
  const context = await init(args);
  profileCheckpoint('init_done');
  
  // Step 2: One-time setup (creates ~/.claude/ if needed)
  await setup(context);
  profileCheckpoint('setup_done');
  
  // Step 3: Launch appropriate interface
  if (args.print) {
    // Non-interactive mode: process single prompt and exit
    await runNonInteractive(context, args);
  } else {
    // Interactive REPL mode
    await launchRepl(context);
  }
  
  profileCheckpoint('main_complete');
  
  // Print performance report in debug mode
  if (args.debug) {
    const { profiler } = await import('./performance/index.js');
    console.log(profiler.getReport());
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
