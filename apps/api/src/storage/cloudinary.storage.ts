import { v2 as cloudinary } from 'cloudinary';
import { StorageService, UploadOptions, UploadResult } from './storage.service';
import { logger } from '../utils/logger';

export class CloudinaryStorageService implements StorageService {
  async upload(filePathOrBuffer: string | Buffer, options: UploadOptions): Promise<UploadResult> {
    const folder = options.folder || 'patient-dashboard/patients';
    const publicId = options.publicId
      ? `${folder}/${options.publicId}`
      : `${folder}/${Date.now()}-${options.fileName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, '')}`;

    try {
      let uploadRes: any;

      if (typeof filePathOrBuffer === 'string') {
        // Upload from staged file on disk
        uploadRes = await cloudinary.uploader.upload(filePathOrBuffer, {
          public_id: publicId,
          overwrite: true,
          resource_type: 'image',
          quality: 'auto',
          fetch_format: 'auto'
        });
      } else {
        // Upload from memory buffer
        uploadRes = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              public_id: publicId,
              overwrite: true,
              resource_type: 'image',
              quality: 'auto',
              fetch_format: 'auto'
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(filePathOrBuffer);
        });
      }

      logger.info(`Successfully uploaded asset to Cloudinary: ${uploadRes.public_id}`);

      return {
        provider: 'cloudinary',
        publicId: uploadRes.public_id,
        secureUrl: uploadRes.secure_url,
        width: uploadRes.width,
        height: uploadRes.height,
        format: uploadRes.format,
        bytes: uploadRes.bytes
      };
    } catch (error) {
      logger.error('Failed to upload asset to Cloudinary', { error, publicId });
      throw new Error('Cloudinary media upload failed');
    }
  }

  async delete(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      logger.info(`Cloudinary deletion for asset ${publicId}: ${result.result}`);
      return result.result === 'ok' || result.result === 'not found';
    } catch (error) {
      logger.error('Failed to delete asset from Cloudinary', { error, publicId });
      return false;
    }
  }

  getUrl(publicId: string, options?: { width?: number; height?: number; crop?: string; gravity?: string }): string {
    return cloudinary.url(publicId, {
      secure: true,
      quality: 'auto',
      fetch_format: 'auto',
      width: options?.width,
      height: options?.height,
      crop: options?.crop || (options?.width || options?.height ? 'fill' : undefined),
      gravity: options?.gravity || (options?.width || options?.height ? 'face' : undefined)
    });
  }

  getOptimizedUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      secure: true,
      fetch_format: 'auto',
      quality: 'auto'
    });
  }

  getAutoCropUrl(publicId: string, width: number = 500, height: number = 500): string {
    return cloudinary.url(publicId, {
      secure: true,
      crop: 'auto',
      gravity: 'auto',
      width,
      height,
      fetch_format: 'auto',
      quality: 'auto'
    });
  }
}
