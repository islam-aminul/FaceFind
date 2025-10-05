import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { RekognitionClient } from '@aws-sdk/client-rekognition';
import { SESClient } from '@aws-sdk/client-ses';

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';

// DynamoDB Configuration
const dynamoDbClient = new DynamoDBClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
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
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Rekognition Configuration
export const rekognitionClient = new RekognitionClient({
  region: process.env.REKOGNITION_REGION || AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// SES Configuration
export const sesClient = new SESClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
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

// S3 Bucket
export const S3_BUCKET = process.env.S3_BUCKET_NAME || 'facefind-photos';

export const S3_FOLDERS = {
  ORIGINALS: 'originals',
  PROCESSED: 'processed',
  THUMBNAILS: 'thumbnails',
  QR_CODES: 'qr-codes',
  EVENT_ASSETS: 'event-assets',
};
