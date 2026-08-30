import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const getDatabaseStatus = (): 'connected' | 'connecting' | 'disconnected' => {
  const readyState = mongoose.connection.readyState;
  switch (readyState) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    default:
      return 'disconnected';
  }
};

export const connectDatabase = async (): Promise<typeof mongoose | null> => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/patient_portal';

  try {
    const sanitizedUri = mongoUri.replace(/\/\/(.*):(.*)@/, '//***:***@');
    logger.info(`Connecting to MongoDB at ${sanitizedUri}`);

    const connection = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      autoIndex: true
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    logger.info('MongoDB connection established successfully');
    return connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB instance.', { error });
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      logger.warn('Running in development mode with pending MongoDB connection');
      return null;
    }
  }
};
