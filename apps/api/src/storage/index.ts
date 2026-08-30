import { StorageService, UploadOptions, UploadResult } from './storage.service';
import { CloudinaryStorageService } from './cloudinary.storage';
import { logger } from '../utils/logger';

export class LocalFallbackStorageService implements StorageService {
  async upload(filePathOrBuffer: string | Buffer, options: UploadOptions): Promise<UploadResult> {
    const folder = options.folder || 'patient-dashboard/patients';
    const publicId = options.publicId
      ? `${folder}/${options.publicId}`
      : `${folder}/local-${Date.now()}-${options.fileName}`;

    logger.info(`LocalFallbackStorage: Staging image asset simulation for ${publicId}`);

    return {
      provider: 'local',
      publicId,
      secureUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80`,
      width: 800,
      height: 800,
      format: 'webp',
      bytes: typeof filePathOrBuffer === 'string' ? 50000 : filePathOrBuffer.length
    };
  }

  async delete(publicId: string): Promise<boolean> {
    logger.info(`LocalFallbackStorage: Asset delete simulation for ${publicId}`);
    return true;
  }

  getUrl(publicId: string, options?: { width?: number; height?: number; crop?: string; gravity?: string }): string {
    return `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80`;
  }
}

export const getStorageService = (): StorageService => {
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    logger.info('Using Cloudinary Storage Service');
    return new CloudinaryStorageService();
  }

  logger.warn('Cloudinary credentials not configured; using local fallback storage');
  return new LocalFallbackStorageService();
};

export * from './storage.service';
export * from './cloudinary.storage';
