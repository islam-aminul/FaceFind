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
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, UpdateCommand, BatchWriteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sesClient = new SESClient({ region: process.env.AWS_REGION || 'ap-south-1' });

const EVENT_TABLE = process.env.EVENT_TABLE || 'Event';
const SESSION_TABLE = process.env.SESSION_TABLE || 'Session';
const USER_TABLE = process.env.USER_TABLE || 'User';
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@facefind.com';

interface Event {
  id: string;
  eventName: string;
  endDateTime: string;
  gracePeriodDays: number;
  retentionPeriodDays: number;
  status: string;
  organizerId: string;
}

interface Session {
  id: string;
  eventId: string;
  expiresAt: number;
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Send grace period end notification to organizer
 */
async function sendGracePeriodEndNotification(event: Event): Promise<void> {
  try {
    // Fetch organizer details
    const { Item: organizer } = await docClient.send(
      new GetCommand({
        TableName: USER_TABLE,
        Key: { id: event.organizerId },
      })
    );

    if (!organizer || !organizer.email) {
      console.log(`Organizer not found or has no email for event ${event.id}`);
      return;
    }

    const user = organizer as User;
    const organizerName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName || user.lastName || 'Organizer';

    // Calculate retention period end date
    const endDate = new Date(event.endDateTime);
    const retentionEndDate = new Date(
      endDate.getTime() +
      (event.gracePeriodDays + event.retentionPeriodDays) * 24 * 60 * 60 * 1000
    );
    const daysRemaining = event.retentionPeriodDays;

    const subject = `Grace Period Ended: ${event.eventName} - FaceFind`;
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Grace Period Ended for Your Event</h2>
          <p>Hi ${organizerName},</p>
          <p>The grace period for your event <strong>${event.eventName}</strong> has ended.</p>

          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>⏰ Important:</strong> Your event photos will be permanently deleted in <strong>${daysRemaining} days</strong> (${retentionEndDate.toLocaleDateString()}).</p>
          </div>

          <p><strong>What happens now:</strong></p>
          <ul>
            <li>Attendees can no longer scan their faces to find photos</li>
            <li>All attendee access has been removed</li>
            <li>You and your photographers can still download all photos</li>
            <li>Photos will be permanently deleted after the retention period ends</li>
          </ul>

          <p><strong>Action Required:</strong></p>
          <p>Make sure to download all event photos before the retention period ends!</p>

          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/organizer/events/${event.id}/photos"
               style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Download Event Photos
            </a>
          </p>

          <p>If you have any questions, please contact our support team.</p>
          <br>
          <p>Best regards,<br>The FaceFind Team</p>
        </body>
      </html>
    `;

    const textBody = `
Grace Period Ended for Your Event

Hi ${organizerName},

The grace period for your event "${event.eventName}" has ended.

IMPORTANT: Your event photos will be permanently deleted in ${daysRemaining} days (${retentionEndDate.toLocaleDateString()}).

What happens now:
- Attendees can no longer scan their faces to find photos
- All attendee access has been removed
- You and your photographers can still download all photos
- Photos will be permanently deleted after the retention period ends

Action Required:
Make sure to download all event photos before the retention period ends!

Visit: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/organizer/events/${event.id}/photos

Best regards,
The FaceFind Team
    `.trim();

    // Send email via SES
    await sesClient.send(
      new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: {
          ToAddresses: [user.email],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8',
            },
            Text: {
              Data: textBody,
              Charset: 'UTF-8',
            },
          },
        },
      })
    );

    console.log(`Grace period end notification sent to ${user.email}`);
  } catch (error) {
    console.error(`Failed to send grace period notification for event ${event.id}:`, error);
    // Don't throw - we don't want to fail the entire cleanup process
  }
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

          // Send notification email to organizer
          await sendGracePeriodEndNotification(event);
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
