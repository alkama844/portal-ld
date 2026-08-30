import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger';

export function configureCloudinary(): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    logger.info(`Cloudinary configured for cloud: ${cloudName}`);
    return true;
  }

  logger.warn('Cloudinary credentials omitted. Local fallback storage will be used for staging.');
  return false;
}

export { cloudinary };
