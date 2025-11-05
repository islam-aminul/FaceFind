/**
 * Retention Period Cleanup Lambda Function
 *
 * Scheduled to run daily at midnight
 *
 * Process:
 * 1. Find all events where retention period has ended
 * 2. Delete all photos from S3 (originals, processed, thumbnails)
 * 3. Delete all photo metadata from DynamoDB
 * 4. Delete Rekognition collection
 * 5. Update event status to ARCHIVED
 * 6. Send notification to organizer
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, UpdateCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { RekognitionClient, DeleteCollectionCommand } from '@aws-sdk/client-rekognition';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
const rekognitionClient = new RekognitionClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const sesClient = new SESClient({ region: process.env.AWS_REGION || 'ap-south-1' });

const EVENT_TABLE = process.env.EVENT_TABLE || 'Event';
const PHOTO_TABLE = process.env.PHOTO_TABLE || 'Photo';
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'facefind-photos';
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@facefind.com';

interface Event {
  id: string;
  eventName: string;
  endDateTime: string;
  retentionPeriodDays: number;
  gracePeriodDays: number;
  status: string;
  organizerId: string;
  rekognitionCollectionId: string;
}

interface Photo {
  id: string;
  eventId: string;
}

export const handler = async (): Promise<void> => {
  console.log('Starting retention period cleanup...');

  const now = new Date();

  try {
    // Find events in DOWNLOAD_PERIOD status
    const { Items: events } = await docClient.send(
      new ScanCommand({
        TableName: EVENT_TABLE,
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'DOWNLOAD_PERIOD',
        },
      })
    );

    if (!events || events.length === 0) {
      console.log('No events found in DOWNLOAD_PERIOD status');
      return;
    }

    console.log(`Found ${events.length} events to check`);

    for (const event of events as Event[]) {
      try {
        // Calculate retention period end date
        const endDate = new Date(event.endDateTime);
        const retentionEndDate = new Date(
          endDate.getTime() +
          (event.gracePeriodDays + event.retentionPeriodDays) * 24 * 60 * 60 * 1000
        );

        // Check if retention period has ended
        if (now > retentionEndDate) {
          console.log(`Retention period ended for event ${event.id} (${event.eventName})`);

          // 1. Delete all photos from S3
          await deleteEventPhotosFromS3(event.id);

          // 2. Delete all photo metadata from DynamoDB
          await deleteEventPhotosFromDynamoDB(event.id);

          // 3. Delete Rekognition collection
          await deleteRekognitionCollection(event.rekognitionCollectionId);

          // 4. Update event status to ARCHIVED
          await docClient.send(
            new UpdateCommand({
              TableName: EVENT_TABLE,
              Key: { id: event.id },
              UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
              ExpressionAttributeNames: {
                '#status': 'status',
              },
              ExpressionAttributeValues: {
                ':status': 'ARCHIVED',
                ':updatedAt': new Date().toISOString(),
              },
            })
          );

          console.log(`Event ${event.id} archived successfully`);

          // 5. Send notification email to organizer (optional)
          // Implement similar to other email notifications
        }
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        // Continue with next event
      }
    }

    console.log('Retention period cleanup completed successfully');
  } catch (error) {
    console.error('Retention period cleanup error:', error);
    throw error;
  }
};

async function deleteEventPhotosFromS3(eventId: string): Promise<void> {
  console.log(`Deleting S3 photos for event ${eventId}`);

  const folders = ['originals', 'processed', 'thumbnails'];

  for (const folder of folders) {
    const prefix = `${folder}/${eventId}/`;

    try {
      // List all objects in the folder
      const listResponse = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: S3_BUCKET,
          Prefix: prefix,
        })
      );

      if (listResponse.Contents && listResponse.Contents.length > 0) {
        // Delete objects in batches of 1000 (S3 limit)
        const objectsToDelete = listResponse.Contents.map(obj => ({ Key: obj.Key! }));

        for (let i = 0; i < objectsToDelete.length; i += 1000) {
          const batch = objectsToDelete.slice(i, i + 1000);
          await s3Client.send(
            new DeleteObjectsCommand({
              Bucket: S3_BUCKET,
              Delete: {
                Objects: batch,
              },
            })
          );
        }

        console.log(`Deleted ${objectsToDelete.length} objects from ${folder}/${eventId}`);
      }
    } catch (error) {
      console.error(`Error deleting from ${folder}/${eventId}:`, error);
      // Continue with other folders
    }
  }
}

async function deleteEventPhotosFromDynamoDB(eventId: string): Promise<void> {
  console.log(`Deleting photo metadata for event ${eventId}`);

  try {
    const { Items: photos } = await docClient.send(
      new ScanCommand({
        TableName: PHOTO_TABLE,
        FilterExpression: 'eventId = :eventId',
        ExpressionAttributeValues: {
          ':eventId': eventId,
        },
      })
    );

    if (photos && photos.length > 0) {
      console.log(`Found ${photos.length} photos to delete`);

      // Batch delete (max 25 at a time)
      const deleteRequests = (photos as Photo[]).map(photo => ({
        DeleteRequest: {
          Key: { id: photo.id },
        },
      }));

      // Split into batches of 25
      for (let i = 0; i < deleteRequests.length; i += 25) {
        const batch = deleteRequests.slice(i, i + 25);
        await docClient.send(
          new BatchWriteCommand({
            RequestItems: {
              [PHOTO_TABLE]: batch,
            },
          })
        );
      }

      console.log(`Deleted ${photos.length} photo records from DynamoDB`);
    }
  } catch (error) {
    console.error(`Error deleting photos from DynamoDB:`, error);
    throw error;
  }
}

async function deleteRekognitionCollection(collectionId: string): Promise<void> {
  console.log(`Deleting Rekognition collection ${collectionId}`);

  try {
    await rekognitionClient.send(
      new DeleteCollectionCommand({
        CollectionId: collectionId,
      })
    );
    console.log(`Rekognition collection ${collectionId} deleted`);
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(`Collection ${collectionId} not found, skipping`);
    } else {
      console.error(`Error deleting Rekognition collection:`, error);
      // Don't throw - continue with archiving even if collection deletion fails
    }
  }
}
