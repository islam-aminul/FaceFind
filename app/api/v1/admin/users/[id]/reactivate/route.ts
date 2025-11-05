import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { CognitoIdentityProviderClient, AdminEnableUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { emailService } from '@/lib/aws/ses';
import '@/lib/amplify-config';

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'ap-south-1',
});

const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID || 'ap-south-1_Hef2kiqUJ';

// POST - Reactivate user
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

    // Check if user is suspended
    if (user.status !== 'SUSPENDED') {
      return NextResponse.json({ error: 'User is not suspended' }, { status: 400 });
    }

    // Update user status in DynamoDB
    const { data: updatedUser } = await client.models.User.update({
      id: params.id,
      status: 'ACTIVE',
    });

    // Enable user in Cognito
    try {
      await cognitoClient.send(
        new AdminEnableUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: user.email,
        })
      );
    } catch (cognitoError) {
      console.error('Failed to enable user in Cognito:', cognitoError);
      // Continue anyway as status is updated in DynamoDB
    }

    // Send reactivation notification email
    try {
      const userName = `${user.firstName} ${user.lastName}`;
      await emailService.sendReactivationEmail(user.email, userName);
      console.log(`Reactivation email sent to ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send reactivation email:', emailError);
      // Don't fail the reactivation if email fails
    }

    return NextResponse.json({
      message: 'User reactivated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error reactivating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
