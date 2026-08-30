import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import app from './app';
import { connectDatabase, getDatabaseStatus } from './config/database';
import { configureCloudinary } from './config/cloudinary';
import { cleanupService } from './services/cleanup.service';
import { seedDefaultAdminIfNotExist } from './controllers/auth.controller';
import { logger } from './utils/logger';

function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!process.env.PORT) {
    process.env.PORT = '5000';
  }

  const requiredVars = ['JWT_SECRET'];
  if (isProduction) {
    requiredVars.push('MONGODB_URI');
  }

  for (const v of requiredVars) {
    if (!process.env[v]) {
      logger.error(`Critical environment variable missing: ${v}`);
      process.exit(1);
    }
  }

  // Validate Cloudinary configuration
  const hasCloudinary = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  if (!hasCloudinary) {
    if (isProduction) {
      logger.error('Missing required Cloudinary credentials for production media storage.');
      process.exit(1);
    } else {
      logger.warn('Cloudinary credentials omitted. Local development fallback storage active.');
    }
  }
}

const PORT = process.env.PORT || 5000;

async function startServer() {
  validateEnvironment();
  configureCloudinary();
  cleanupService.startPeriodicCleanup(30); // Clean /uploaded staging every 30 mins

  try {
    const db = await connectDatabase();
    if (db && getDatabaseStatus() === 'connected') {
      await seedDefaultAdminIfNotExist();
    }
  } catch (error) {
    logger.warn('Initial MongoDB connection attempt deferred to background reconnection.');
  }

  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    logger.info(`API Health: http://localhost:${PORT}/api/health`);
  });

  const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer().catch((error) => {
  logger.error('Failed to start server:', { error });
  process.exit(1);
});
