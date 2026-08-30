import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export class CleanupService {
  private uploadDir: string;
  private maxAgeMs: number;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.uploadDir = path.resolve(__dirname, '../../uploaded');
    const maxAgeMinutes = Number(process.env.UPLOAD_TEMP_MAX_AGE_MINUTES) || 60;
    this.maxAgeMs = maxAgeMinutes * 60 * 1000;
  }

  async runCleanup(): Promise<number> {
    if (!fs.existsSync(this.uploadDir)) return 0;

    let deletedCount = 0;
    const now = Date.now();

    try {
      const files = await fs.promises.readdir(this.uploadDir);

      for (const file of files) {
        if (file === '.gitkeep') continue;

        const filePath = path.join(this.uploadDir, file);
        try {
          const stats = await fs.promises.stat(filePath);
          const ageMs = now - stats.mtimeMs;

          if (ageMs > this.maxAgeMs) {
            await fs.promises.unlink(filePath);
            deletedCount++;
            logger.info(`Purged expired staging file: ${file}`);
          }
        } catch (err) {
          // File might have been removed already by another process
        }
      }

      if (deletedCount > 0) {
        logger.info(`CleanupService purged ${deletedCount} expired temporary files.`);
      }
    } catch (error) {
      logger.warn('CleanupService encounter error during directory scan', { error });
    }

    return deletedCount;
  }

  startPeriodicCleanup(intervalMinutes = 30): void {
    // Run initial pass
    this.runCleanup();

    // Schedule recurring passes
    this.timer = setInterval(() => {
      this.runCleanup();
    }, intervalMinutes * 60 * 1000);

    // Unref so it does not block Node process exit
    if (this.timer.unref) {
      this.timer.unref();
    }

    logger.info(`Periodic /uploaded cleanup job started (Interval: ${intervalMinutes}m, MaxAge: ${Math.round(this.maxAgeMs / 60000)}m)`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const cleanupService = new CleanupService();
