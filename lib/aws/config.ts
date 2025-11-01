import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { RekognitionClient } from '@aws-sdk/client-rekognition';
import { SESClient } from '@aws-sdk/client-ses';
import { settingsService } from '@/lib/services/settings-service';

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';

// Storage and Rekognition configs will be loaded dynamically
let storageConfigCache: { s3Region?: string; rekognitionRegion?: string } = {};

// DynamoDB Configuration
const dynamoDbClient = new DynamoDBClient({
  region: AWS_REGION,
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

export const docClient = DynamoDBDocumentClient.from(dynamoDbClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});

// S3 Configuration
export const s3Client = new S3Client({
  region: process.env.S3_REGION || AWS_REGION,
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

// Rekognition Configuration
export const rekognitionClient = new RekognitionClient({
  region: process.env.REKOGNITION_REGION || AWS_REGION,
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

// SES Configuration
export const sesClient = new SESClient({
  region: AWS_REGION,
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

// Table Names
export const TABLES = {
  USERS: process.env.DYNAMODB_USERS_TABLE || 'facefind-users',
  EVENTS: process.env.DYNAMODB_EVENTS_TABLE || 'facefind-events',
  PHOTOS: process.env.DYNAMODB_PHOTOS_TABLE || 'facefind-photos',
  FACE_TEMPLATES: process.env.DYNAMODB_FACE_TEMPLATES_TABLE || 'facefind-face-templates',
  SESSIONS: process.env.DYNAMODB_SESSIONS_TABLE || 'facefind-sessions',
  BILLING: process.env.DYNAMODB_BILLING_TABLE || 'facefind-billing',
  AUDIT_LOGS: process.env.DYNAMODB_AUDIT_LOGS_TABLE || 'facefind-audit-logs',
  PHOTOGRAPHER_ASSIGNMENTS: process.env.DYNAMODB_PHOTOGRAPHER_ASSIGNMENTS_TABLE || 'facefind-photographer-assignments',
};

// S3 Bucket - Use environment variable as primary source
export const S3_BUCKET = process.env.S3_BUCKET_NAME || process.env.NEXT_PUBLIC_S3_BUCKET || 'facefind-photos';

export const S3_FOLDERS = {
  ORIGINALS: 'originals',
  PROCESSED: 'processed',
  THUMBNAILS: 'thumbnails',
  QR_CODES: 'qr-codes',
  EVENT_ASSETS: 'event-assets',
};

/**
 * Get S3 bucket name from settings or environment
 */
export async function getS3BucketName(): Promise<string> {
  try {
    const config = await settingsService.getStorageConfig();
    return config.s3BucketName;
  } catch (error) {
    console.error('Error getting S3 bucket from settings:', error);
    return S3_BUCKET;
  }
}

/**
 * Get S3 region from settings or environment
 */
export async function getS3Region(): Promise<string> {
  if (storageConfigCache.s3Region) {
    return storageConfigCache.s3Region;
  }

  try {
    const config = await settingsService.getStorageConfig();
    storageConfigCache.s3Region = config.s3Region;
    return config.s3Region;
  } catch (error) {
    console.error('Error getting S3 region from settings:', error);
    return process.env.S3_REGION || AWS_REGION;
  }
}

/**
 * Get Rekognition region from settings or environment
 */
export async function getRekognitionRegion(): Promise<string> {
  if (storageConfigCache.rekognitionRegion) {
    return storageConfigCache.rekognitionRegion;
  }

  try {
    const config = await settingsService.getFaceRecognitionConfig();
    storageConfigCache.rekognitionRegion = config.rekognitionRegion;
    return config.rekognitionRegion;
  } catch (error) {
    console.error('Error getting Rekognition region from settings:', error);
    return process.env.REKOGNITION_REGION || AWS_REGION;
  }
}
