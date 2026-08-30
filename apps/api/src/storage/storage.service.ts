export interface UploadOptions {
  fileName: string;
  mimeType: string;
  folder?: string;
  publicId?: string;
}

export interface UploadResult {
  provider: 'cloudinary' | 'local';
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export interface StorageService {
  upload(filePathOrBuffer: string | Buffer, options: UploadOptions): Promise<UploadResult>;
  delete(publicId: string): Promise<boolean>;
  getUrl(publicId: string, options?: { width?: number; height?: number; crop?: string; gravity?: string }): string;
}
