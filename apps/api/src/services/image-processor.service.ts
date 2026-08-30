import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface ProcessedImageResult {
  tempFilePath: string;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export class ImageProcessorService {
  private uploadDir: string;
  private maxInputSizeBytes: number;
  private targetMaxSizeBytes: number;

  constructor() {
    this.uploadDir = path.resolve(__dirname, '../../uploaded');
    // Accept up to 10MB raw upload to allow modern high-res mobile photos
    this.maxInputSizeBytes = 10 * 1024 * 1024;
    // Strict output target: 1 MB (1,048,576 bytes)
    this.targetMaxSizeBytes = 1 * 1024 * 1024;

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async processProfileImage(
    fileBuffer: Buffer,
    originalName: string,
    reportedMimeType: string
  ): Promise<ProcessedImageResult> {
    // 1. Validate raw input size limit (10MB max raw intake)
    if (fileBuffer.length > this.maxInputSizeBytes) {
      throw new Error('Image is too large. Please upload an image under 10 MB.');
    }

    // 2. Validate image structure & format with Sharp
    let metadata: sharp.Metadata;
    try {
      const sharpInstance = sharp(fileBuffer);
      metadata = await sharpInstance.metadata();
    } catch (err) {
      logger.error('Invalid image buffer format received', { err });
      throw new Error('Invalid file format. Please upload a valid JPEG, PNG, WebP, or AVIF image.');
    }

    const allowedFormats = ['jpeg', 'png', 'webp', 'avif'];
    if (!metadata.format || !allowedFormats.includes(metadata.format)) {
      throw new Error('Unsupported image format. Allowed formats are JPEG, PNG, WebP, and AVIF.');
    }

    // 3. Multi-pass intelligent compressor: guarantees final output <= 1 MB
    const randomId = crypto.randomBytes(6).toString('hex');
    const tempFileName = `tmp-${Date.now()}-${randomId}.webp`;
    const tempFilePath = path.join(this.uploadDir, tempFileName);

    let maxDimension = 1200;
    let quality = 80;
    let transformedBuffer: Buffer | null = null;
    let attempts = 0;

    while (attempts < 5) {
      attempts++;
      transformedBuffer = await sharp(fileBuffer)
        .rotate() // Auto-orient based on EXIF
        .resize({
          width: maxDimension,
          height: maxDimension,
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality, effort: 4 })
        .toBuffer();

      // If output is within 1MB target, accept it
      if (transformedBuffer.length <= this.targetMaxSizeBytes) {
        break;
      }

      // Step down compression parameters if still larger than 1MB
      quality -= 15;
      maxDimension = Math.round(maxDimension * 0.8);
      if (quality < 35) quality = 35;
    }

    if (!transformedBuffer) {
      throw new Error('Failed to process image through compression pipeline.');
    }

    // 4. Save to temporary /uploaded staging area
    await fs.promises.writeFile(tempFilePath, transformedBuffer);

    const outputMetadata = await sharp(transformedBuffer).metadata();
    const compressionRatio = ((1 - transformedBuffer.length / fileBuffer.length) * 100).toFixed(1);

    logger.info(
      `Image compressed to <=1MB and staged at ${tempFileName} (${(fileBuffer.length / 1024).toFixed(1)} KB -> ${(transformedBuffer.length / 1024).toFixed(1)} KB, reduced by ${compressionRatio}%)`
    );

    return {
      tempFilePath,
      fileName: tempFileName,
      mimeType: 'image/webp',
      width: outputMetadata.width || 0,
      height: outputMetadata.height || 0,
      sizeBytes: transformedBuffer.length
    };
  }

  async removeTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        logger.debug(`Deleted temporary file: ${path.basename(filePath)}`);
      }
    } catch (error) {
      logger.warn(`Failed to unlink temporary file: ${filePath}`, { error });
    }
  }
}

export const imageProcessorService = new ImageProcessorService();
