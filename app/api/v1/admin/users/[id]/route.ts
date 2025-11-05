import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import '@/lib/amplify-config';

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'ap-south-1',
});

const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID || 'ap-south-1_Hef2kiqUJ';

// GET - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user } = await client.models.User.get({ id: params.id });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, phone, status, companyName, portfolioUrl, specialization, bio } = body;

    // Get existing user
    const { data: existingUser } = await client.models.User.get({ id: params.id });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user in DynamoDB
    const updateData: any = {
      id: params.id,
      firstName,
      lastName,
      phone,
      status,
    };

    if (existingUser.role === 'ORGANIZER' && companyName !== undefined) {
      updateData.companyName = companyName;
    }

    if (existingUser.role === 'PHOTOGRAPHER') {
      if (portfolioUrl !== undefined) updateData.portfolioUrl = portfolioUrl;
      if (specialization !== undefined) updateData.specialization = specialization;
      if (bio !== undefined) updateData.bio = bio;
    }

    const { data: updatedUser } = await client.models.User.update(updateData);

    // Update Cognito attributes
    try {
      await cognitoClient.send(
        new AdminUpdateUserAttributesCommand({
          UserPoolId: USER_POOL_ID,
          Username: existingUser.email,
          UserAttributes: [
            { Name: 'given_name', Value: firstName },
            { Name: 'family_name', Value: lastName },
          ],
        })
      );
    } catch (cognitoError) {
      console.error('Failed to update Cognito attributes:', cognitoError);
      // Continue anyway as DynamoDB is source of truth
    }

    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete user
export async function DELETE(
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

    // Prevent deleting admin users
    if (user.role === 'ADMIN') {
      return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 400 });
    }

    // Check for active assignments if photographer
    if (user.role === 'PHOTOGRAPHER') {
      const { data: assignments } = await client.models.PhotographerAssignment.list({
        filter: { photographerId: { eq: params.id } }
      });

      if (assignments && assignments.length > 0) {
        return NextResponse.json(
          {
            error: 'Cannot delete photographer',
            reason: `Photographer has ${assignments.length} event assignment(s). Please remove all assignments before deleting.`,
            assignmentCount: assignments.length
          },
          { status: 400 }
        );
      }

      // Check for photos uploaded by this photographer
      const { data: photos } = await client.models.Photo.list({
        filter: { photographerId: { eq: params.id } }
      });

      if (photos && photos.length > 0) {
        return NextResponse.json(
          {
            error: 'Cannot delete photographer',
            reason: `Photographer has uploaded ${photos.length} photo(s). Cannot delete photographer with uploaded photos.`,
            photoCount: photos.length
          },
          { status: 400 }
        );
      }
    }

    // Check for owned events if organizer
    if (user.role === 'ORGANIZER') {
      const { data: events } = await client.models.Event.list({
        filter: { organizerId: { eq: params.id } }
      });

      if (events && events.length > 0) {
        return NextResponse.json(
          {
            error: 'Cannot delete organizer',
            reason: `Organizer owns ${events.length} event(s). Please delete or reassign all events before deleting the organizer.`,
            eventCount: events.length
          },
          { status: 400 }
        );
      }
    }

    // Delete from DynamoDB
    await client.models.User.delete({ id: params.id });

    // Delete from Cognito
    try {
      await cognitoClient.send(
        new AdminDeleteUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: user.email,
        })
      );
    } catch (cognitoError) {
      console.error('Failed to delete from Cognito:', cognitoError);
      // Continue anyway as user is deleted from DynamoDB
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
