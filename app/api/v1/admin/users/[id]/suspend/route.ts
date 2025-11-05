import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { CognitoIdentityProviderClient, AdminDisableUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { emailService } from '@/lib/aws/ses';
import '@/lib/amplify-config';

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'ap-south-1',
});

const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID || 'ap-south-1_Hef2kiqUJ';

// POST - Suspend user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const { data: user } = await client.models.User.get({ id: params.id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent suspending admin users
    if (user.role === 'ADMIN') {
      return NextResponse.json({ error: 'Cannot suspend admin users' }, { status: 400 });
    }

    // Check if already suspended
    if (user.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'User is already suspended' }, { status: 400 });
    }

    // For photographers, check for upcoming events
    if (user.role === 'PHOTOGRAPHER') {
      // Get all photographer assignments
      const { data: assignments } = await client.models.PhotographerAssignment.list({
        filter: {
          photographerId: { eq: params.id }
        }
      });

      if (assignments && assignments.length > 0) {
        // Check if any assigned events are upcoming (CREATED, PAID, or ACTIVE status)
        const upcomingEvents: any[] = [];
        const now = new Date();

        for (const assignment of assignments) {
          // Get the event details
          const { data: event } = await client.models.Event.get({ id: assignment.eventId });

          if (event) {
            // Event is upcoming if it's in CREATED, PAID, or ACTIVE status
            // or if the end date hasn't passed yet
            const eventEndDate = new Date(event.endDateTime);
            const isUpcoming =
              ['CREATED', 'PAID', 'ACTIVE'].includes(event.status) ||
              eventEndDate > now;

            if (isUpcoming) {
              upcomingEvents.push({
                eventId: event.id,
                eventName: event.eventName,
                status: event.status,
                startDateTime: event.startDateTime,
                endDateTime: event.endDateTime,
              });
            }
          }
        }

        // If there are upcoming events, prevent suspension
        if (upcomingEvents.length > 0) {
          return NextResponse.json({
            error: 'Cannot suspend photographer with upcoming events. Please reassign all events first.',
            upcomingEvents,
            count: upcomingEvents.length,
          }, { status: 400 });
        }
      }
    }

    // Update user status in DynamoDB
    const { data: updatedUser } = await client.models.User.update({
      id: params.id,
      status: 'SUSPENDED',
    });

    // Disable user in Cognito
    try {
      await cognitoClient.send(
        new AdminDisableUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: user.email,
        })
      );
    } catch (cognitoError) {
      console.error('Failed to disable user in Cognito:', cognitoError);
      // Continue anyway as status is updated in DynamoDB
    }

    // Send suspension notification email
    try {
      const userName = `${user.firstName} ${user.lastName}`;
      await emailService.sendSuspensionEmail(user.email, userName);
      console.log(`Suspension email sent to ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send suspension email:', emailError);
      // Don't fail the suspension if email fails
    }

    return NextResponse.json({
      message: 'User suspended successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error suspending user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
