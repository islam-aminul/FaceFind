/**
 * Grace Period Cleanup Lambda Function
 *
 * Scheduled to run daily at midnight
 *
 * Process:
 * 1. Find all events where grace period has ended
 * 2. Delete all sessions for those events
 * 3. Optionally: Send notification to attendees (if phone number stored)
 * 4. Update event status to DOWNLOAD_PERIOD
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, UpdateCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sesClient = new SESClient({ region: process.env.AWS_REGION || 'ap-south-1' });

const EVENT_TABLE = process.env.EVENT_TABLE || 'Event';
const SESSION_TABLE = process.env.SESSION_TABLE || 'Session';
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@facefind.com';

interface Event {
  id: string;
  eventName: string;
  endDateTime: string;
  gracePeriodDays: number;
  status: string;
  organizerId: string;
}

interface Session {
  id: string;
  eventId: string;
  expiresAt: number;
}

export const handler = async (): Promise<void> => {
  console.log('Starting grace period cleanup...');

  const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds

  try {
    // Find events in ACTIVE or GRACE_PERIOD status
    const { Items: events } = await docClient.send(
      new ScanCommand({
        TableName: EVENT_TABLE,
        FilterExpression: '#status IN (:active, :grace)',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':active': 'ACTIVE',
          ':grace': 'GRACE_PERIOD',
        },
      })
    );

    if (!events || events.length === 0) {
      console.log('No events found in ACTIVE or GRACE_PERIOD status');
      return;
    }

    console.log(`Found ${events.length} events to check`);

    for (const event of events as Event[]) {
      try {
        // Calculate grace period end timestamp
        const endDate = new Date(event.endDateTime);
        const gracePeriodEndDate = new Date(
          endDate.getTime() + event.gracePeriodDays * 24 * 60 * 60 * 1000
        );
        const gracePeriodEndTimestamp = Math.floor(gracePeriodEndDate.getTime() / 1000);

        // Check if grace period has ended
        if (now > gracePeriodEndTimestamp && event.status !== 'DOWNLOAD_PERIOD') {
          console.log(`Grace period ended for event ${event.id} (${event.eventName})`);

          // Delete all sessions for this event
          const { Items: sessions } = await docClient.send(
            new ScanCommand({
              TableName: SESSION_TABLE,
              FilterExpression: 'eventId = :eventId',
              ExpressionAttributeValues: {
                ':eventId': event.id,
              },
            })
          );

          if (sessions && sessions.length > 0) {
            console.log(`Deleting ${sessions.length} sessions for event ${event.id}`);

            // Batch delete sessions (max 25 at a time)
            const deleteRequests = (sessions as Session[]).map(session => ({
              DeleteRequest: {
                Key: { id: session.id },
              },
            }));

            // Split into batches of 25
            for (let i = 0; i < deleteRequests.length; i += 25) {
              const batch = deleteRequests.slice(i, i + 25);
              await docClient.send(
                new BatchWriteCommand({
                  RequestItems: {
                    [SESSION_TABLE]: batch,
                  },
                })
              );
            }

            console.log(`Deleted ${sessions.length} sessions`);
          }

          // Update event status to DOWNLOAD_PERIOD
          await docClient.send(
            new UpdateCommand({
              TableName: EVENT_TABLE,
              Key: { id: event.id },
              UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
              ExpressionAttributeNames: {
                '#status': 'status',
              },
              ExpressionAttributeValues: {
                ':status': 'DOWNLOAD_PERIOD',
                ':updatedAt': new Date().toISOString(),
              },
            })
          );

          console.log(`Updated event ${event.id} to DOWNLOAD_PERIOD status`);

          // TODO: Send notification email to organizer
          // You can implement this using SES similar to other notifications
        }
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        // Continue with next event
      }
    }

    console.log('Grace period cleanup completed successfully');
  } catch (error) {
    console.error('Grace period cleanup error:', error);
    throw error;
  }
};
