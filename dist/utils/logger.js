// src/utils/logger.ts
export class Logger {
    level;
    constructor(level) {
        this.level = level;
    }
    info(msg) {
        console.log(`[INFO] ${msg}`);
    }
}
//# sourceMappingURL=logger.js.map