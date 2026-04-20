/**
 * Setup Module
 * 
 * Performs one-time initialization of the ~/.claude/ directory.
 */

import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { AppContext } from './init.js';

const CLAUDE_DIR = join(homedir(), '.claude');

/**
 * One-Time Setup
 * 
 * Creates the ~/.claude/ directory structure if it doesn't exist.
 * This runs once per machine, not once per session.
 */
export async function setup(context: AppContext): Promise<void> {
  console.log('  🔧 Running setup...');
  
  // Create ~/.claude/ directory
  if (!existsSync(CLAUDE_DIR)) {
    await mkdir(CLAUDE_DIR, { recursive: true });
    console.log(`    Created ${CLAUDE_DIR}`);
  }
  
  // Create settings file if missing
  const settingsPath = join(CLAUDE_DIR, 'settings.json');
  if (!existsSync(settingsPath)) {
    const defaultSettings = {
      version: '1.0.0',
      theme: 'dark',
      autoCompactThreshold: 100000,  // 100k tokens
      createdAt: new Date().toISOString(),
    };
    await writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2));
    console.log(`    Created ${settingsPath}`);
  }
  
  // Create transcripts directory
  const transcriptsDir = join(CLAUDE_DIR, 'transcripts');
  if (!existsSync(transcriptsDir)) {
    await mkdir(transcriptsDir, { recursive: true });
    console.log(`    Created ${transcriptsDir}`);
  }
  
  console.log('  ✅ Setup complete');
}
