import { defineFunction } from '@aws-amplify/backend';

export const photoProcessor = defineFunction({
  name: 'photo-processor',
  entry: './handler.ts',
  runtime: 20, // Node.js 20
  timeoutSeconds: 300, // 5 minutes
  memoryMB: 2048, // 2GB for Sharp image processing
  environment: {
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || 'facefind-photos',
    PHOTO_TABLE: 'Photo',
    EVENT_TABLE: 'Event',
  },
});
