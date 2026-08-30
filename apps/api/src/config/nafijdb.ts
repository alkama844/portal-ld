import { NafijDB } from '@nafijrahaman/db';
import { logger } from '../utils/logger';

let nafijDbInstance: NafijDB | null = null;

export const getNafijDB = (): NafijDB | null => {
  // NRDB is disabled by default to prioritize MongoDB across all operations
  if (process.env.ENABLE_NRDB !== 'true') {
    return null;
  }

  const apiKey = process.env.NAFIJ_DB_KEY;
  if (!apiKey) {
    return null;
  }

  if (!nafijDbInstance) {
    try {
      nafijDbInstance = new NafijDB({ apiKey });
      logger.info('NafijRahaman DB client initialized');
    } catch (error) {
      logger.error('Failed to initialize NafijRahaman DB client', { error });
      return null;
    }
  }

  return nafijDbInstance;
};
