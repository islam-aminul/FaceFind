/**
 * Photo Processing Lambda Function
 *
 * Triggered by S3 uploads to the 'originals' folder
 *
 * Process:
 * 1. Download original photo from S3
 * 2. Resize based on event configuration
 * 3. Apply watermark (event name, date, photographer)
 * 4. Generate thumbnail
 * 5. Detect and index faces in Rekognition
 * 6. Update photo metadata in DynamoDB
 * 7. Upload processed photos back to S3
 */

import { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { RekognitionClient, IndexFacesCommand } from '@aws-sdk/client-rekognition';
import sharp from 'sharp';
import { Readable } from 'stream';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const rekognitionClient = new RekognitionClient({ region: process.env.AWS_REGION || 'ap-south-1' });

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'facefind-photos';
const PHOTO_TABLE = process.env.PHOTO_TABLE || 'Photo';
const EVENT_TABLE = process.env.EVENT_TABLE || 'Event';

interface PhotoMetadata {
  eventId: string;
  photoId: string;
  photographerId: string;
}

interface EventConfig {
  photoResizeWidth?: number;
  photoResizeHeight?: number;
  photoQuality: number;
  watermarkElements: string[];
  rekognitionCollectionId: string;
  eventName: string;
  startDateTime: string;
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function getPhotoMetadata(photoId: string): Promise<any> {
  const result = await docClient.send(
    new GetCommand({
      TableName: PHOTO_TABLE,
      Key: { id: photoId },
    })
  );
  return result.Item;
}

async function getEventConfig(eventId: string): Promise<EventConfig> {
  const result = await docClient.send(
    new GetCommand({
      TableName: EVENT_TABLE,
      Key: { id: eventId },
    })
  );
  return result.Item as EventConfig;
}

async function processImage(
  imageBuffer: Buffer,
  config: EventConfig,
  photographerName: string
): Promise<{ processed: Buffer; thumbnail: Buffer; width: number; height: number }> {
  // Get image metadata
  const metadata = await sharp(imageBuffer).metadata();

  // Resize image
  const targetWidth = config.photoResizeWidth || 2560;
  const targetHeight = config.photoResizeHeight || 1440;

  let processedImage = sharp(imageBuffer)
    .resize(targetWidth, targetHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: config.photoQuality || 85 });

  // Apply watermark if configured
  if (config.watermarkElements && config.watermarkElements.length > 0) {
    const watermarkText = buildWatermarkText(config, photographerName);

    // Create watermark SVG
    const watermarkSvg = `
      <svg width="${targetWidth}" height="60">
        <text
          x="10"
          y="45"
          font-family="Arial"
          font-size="24"
          fill="white"
          fill-opacity="0.7"
          stroke="black"
          stroke-width="1"
        >${watermarkText}</text>
      </svg>
    `;

    processedImage = processedImage.composite([{
      input: Buffer.from(watermarkSvg),
      gravity: 'southwest',
    }]);
  }

  const processedBuffer = await processedImage.toBuffer();
  const processedMeta = await sharp(processedBuffer).metadata();

  // Generate thumbnail (400x300)
  const thumbnailBuffer = await sharp(imageBuffer)
    .resize(400, 300, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 80 })
    .toBuffer();

  return {
    processed: processedBuffer,
    thumbnail: thumbnailBuffer,
    width: processedMeta.width || 0,
    height: processedMeta.height || 0,
  };
}

function buildWatermarkText(config: EventConfig, photographerName: string): string {
  const parts: string[] = [];

  if (config.watermarkElements.includes('EVENT_NAME')) {
    parts.push(config.eventName);
  }

  if (config.watermarkElements.includes('EVENT_DATE')) {
    const date = new Date(config.startDateTime).toLocaleDateString();
    parts.push(date);
  }

  if (config.watermarkElements.includes('PHOTOGRAPHER_NAME')) {
    parts.push(`© ${photographerName}`);
  }

  return parts.join(' | ');
}

async function indexFacesInRekognition(
  imageBuffer: Buffer,
  collectionId: string,
  photoId: string
): Promise<string[]> {
  try {
    const response = await rekognitionClient.send(
      new IndexFacesCommand({
        CollectionId: collectionId,
        Image: { Bytes: imageBuffer },
        ExternalImageId: photoId,
        DetectionAttributes: ['ALL'],
        MaxFaces: 10,
        QualityFilter: 'AUTO',
      })
    );

    return response.FaceRecords?.map(record => record.Face?.FaceId || '') || [];
  } catch (error) {
    console.error('Rekognition indexing error:', error);
    return [];
  }
}

async function updatePhotoMetadata(
  photoId: string,
  updates: {
    processedUrl: string;
    thumbnailUrl: string;
    dimensionsWidth: number;
    dimensionsHeight: number;
    faceCount: number;
    rekognitionFaceIds: string[];
    status: string;
  }
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: PHOTO_TABLE,
      Key: { id: photoId },
      UpdateExpression: `
        SET processedUrl = :processedUrl,
            thumbnailUrl = :thumbnailUrl,
            dimensionsWidth = :width,
            dimensionsHeight = :height,
            faceCount = :faceCount,
            rekognitionFaceIds = :faceIds,
            #status = :status,
            updatedAt = :updatedAt
      `,
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':processedUrl': updates.processedUrl,
        ':thumbnailUrl': updates.thumbnailUrl,
        ':width': updates.dimensionsWidth,
        ':height': updates.dimensionsHeight,
        ':faceCount': updates.faceCount,
        ':faceIds': updates.rekognitionFaceIds,
        ':status': updates.status,
        ':updatedAt': new Date().toISOString(),
      },
    })
  );
}

export const handler = async (event: S3Event): Promise<void> => {
  console.log('Processing S3 event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    console.log(`Processing photo: ${key}`);

    try {
      // Extract metadata from S3 key: originals/{eventId}/{photoId}.{ext}
      const keyParts = key.split('/');
      if (keyParts.length < 3 || keyParts[0] !== 'originals') {
        console.log('Skipping non-original photo');
        continue;
      }

      const eventId = keyParts[1];
      const photoFilename = keyParts[2];
      const photoId = photoFilename.split('.')[0];

      // Get photo metadata
      const photo = await getPhotoMetadata(photoId);
      if (!photo) {
        console.error(`Photo not found: ${photoId}`);
        continue;
      }

      // Update status to PROCESSING
      await updatePhotoMetadata(photoId, {
        ...photo,
        status: 'PROCESSING',
      });

      // Get event configuration
      const eventConfig = await getEventConfig(eventId);
      if (!eventConfig) {
        console.error(`Event not found: ${eventId}`);
        continue;
      }

      // Download original image
      const getObjectResponse = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );

      const imageBuffer = await streamToBuffer(getObjectResponse.Body as Readable);

      // Process image
      const { processed, thumbnail, width, height } = await processImage(
        imageBuffer,
        eventConfig,
        photo.photographerName || 'Unknown'
      );

      // Upload processed image
      const processedKey = `processed/${eventId}/${photoId}.jpg`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: processedKey,
          Body: processed,
          ContentType: 'image/jpeg',
          ServerSideEncryption: 'AES256',
        })
      );

      // Upload thumbnail
      const thumbnailKey = `thumbnails/${eventId}/${photoId}.jpg`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: thumbnailKey,
          Body: thumbnail,
          ContentType: 'image/jpeg',
          ServerSideEncryption: 'AES256',
        })
      );

      // Index faces in Rekognition
      const faceIds = await indexFacesInRekognition(
        processed,
        eventConfig.rekognitionCollectionId,
        photoId
      );

      // Update photo metadata with results
      await updatePhotoMetadata(photoId, {
        processedUrl: `https://${bucket}.s3.amazonaws.com/${processedKey}`,
        thumbnailUrl: `https://${bucket}.s3.amazonaws.com/${thumbnailKey}`,
        dimensionsWidth: width,
        dimensionsHeight: height,
        faceCount: faceIds.length,
        rekognitionFaceIds: faceIds,
        status: 'LIVE',
      });

      console.log(`Successfully processed photo ${photoId}: ${faceIds.length} faces indexed`);
    } catch (error) {
      console.error('Error processing photo:', error);

      // Update photo status to failed (you might want to add a FAILED status)
      // For now, we'll leave it as PROCESSING so admin can retry
    }
  }
};
