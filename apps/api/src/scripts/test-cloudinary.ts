import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from apps/api/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { v2 as cloudinary } from 'cloudinary';

async function testCloudinary() {
  console.log('--- Initializing Cloudinary Test ---');

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'mahkgdyp';
  const apiKey = process.env.CLOUDINARY_API_KEY || '885999628435599';
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!apiSecret || apiSecret === 'your_api_secret_here') {
    console.warn('⚠️  CLOUDINARY_API_SECRET is missing or set to placeholder in apps/api/.env');
    console.warn('   Please set your actual API secret in apps/api/.env to test uploads.\n');
  }

  // 1. Configuration
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  console.log(`Cloudinary Configured: cloud_name=${cloudName}, api_key=${apiKey}\n`);

  try {
    // 2. Upload an image
    console.log('1. Testing image upload from remote sample URL...');
    const uploadResult = await cloudinary.uploader.upload(
      'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg',
      {
        public_id: 'sample_shoes',
        folder: 'patient-dashboard/test',
        overwrite: true,
      }
    );

    console.log('✅ Upload Success:');
    console.log({
      public_id: uploadResult.public_id,
      secure_url: uploadResult.secure_url,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
    });
    console.log();

    // 3. Optimize delivery by resizing and applying auto-format and auto-quality
    const optimizeUrl = cloudinary.url(uploadResult.public_id, {
      fetch_format: 'auto',
      quality: 'auto',
      secure: true,
    });
    console.log('2. Optimized Delivery URL:');
    console.log(optimizeUrl);
    console.log();

    // 4. Transform the image: auto-crop to square aspect_ratio
    const autoCropUrl = cloudinary.url(uploadResult.public_id, {
      crop: 'auto',
      gravity: 'auto',
      width: 500,
      height: 500,
      fetch_format: 'auto',
      quality: 'auto',
      secure: true,
    });
    console.log('3. Auto-Cropped Square (500x500) Transformation URL:');
    console.log(autoCropUrl);
    console.log();

    console.log('✨ Cloudinary setup & test completed successfully!');
  } catch (error: any) {
    console.error('❌ Cloudinary Error:', error.message || error);
    if (!apiSecret || apiSecret === 'your_api_secret_here') {
      console.log('\nTip: Add your CLOUDINARY_API_SECRET to apps/api/.env to resolve authentication failure.');
    }
  }
}

testCloudinary();
