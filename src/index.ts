// src/index.ts
import { Bootstrap } from './bootstrap.js';

async function main() {
  console.log('🚀 Starting Claude Code TypeScript...\n');
  
  const bootstrap = new Bootstrap();
  const { config, state, logger } = await bootstrap.initialize();
  
  logger.info('Agent initialized');
  logger.info(`Model: ${config.model}`);
  
  state.addMessage({
    id: 'system-1',
    role: 'system',
    content: 'You are Claude Code, an AI coding assistant.',
    timestamp: new Date()
  });
  
  console.log('\n✓ Ready for commands');
}

main().catch(console.error);
