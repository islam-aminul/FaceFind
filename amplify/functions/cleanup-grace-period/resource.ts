import { defineFunction } from '@aws-amplify/backend';

export const cleanupGracePeriod = defineFunction({
  name: 'cleanup-grace-period',
  entry: './handler.ts',
  runtime: 20, // Node.js 20
  timeoutSeconds: 900, // 15 minutes
  memoryMB: 512,
  environment: {
    EVENT_TABLE: 'Event',
    SESSION_TABLE: 'Session',
    SES_FROM_EMAIL: process.env.SES_FROM_EMAIL || 'noreply@facefind.com',
  },
});
