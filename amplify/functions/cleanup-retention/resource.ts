import { defineFunction } from '@aws-amplify/backend';

export const cleanupRetention = defineFunction({
  name: 'cleanup-retention',
  entry: './handler.ts',
  runtime: 20, // Node.js 20
  timeoutSeconds: 900, // 15 minutes
  memoryMB: 512,
  environment: {
    EVENT_TABLE: 'Event',
    PHOTO_TABLE: 'Photo',
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || 'facefind-photos',
    SES_FROM_EMAIL: process.env.SES_FROM_EMAIL || 'noreply@facefind.com',
  },
});
