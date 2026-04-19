// src/utils/logger.ts
export class Logger {
  constructor(private level: string) {}

  info(msg: string): void {
    console.log(`[INFO] ${msg}`);
  }
}
