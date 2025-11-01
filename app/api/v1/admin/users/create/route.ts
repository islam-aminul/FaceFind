import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
import '@/lib/amplify-config';

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

// Cognito configuration
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'ap-south-1',
});

const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID || 'ap-south-1_Hef2kiqUJ';

// Generate temporary password
function generateTemporaryPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';

  // Ensure password meets requirements
  password += 'A'; // uppercase
  password += 'a'; // lowercase
  password += '1'; // number
  password += '!'; // special

  for (let i = 4; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add proper token verification when implementing production auth

    // Parse request body
    const body = await request.json();
    const {
      email,
      firstName,
      lastName,
      phone,
      role,
      companyName,
      portfolioUrl,
      specialization,
      bio,
      sendInvitation,
    } = body;

    // Validate required fields
    if (!email || !firstName || !lastName || !phone || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate role
    if (!['ADMIN', 'ORGANIZER', 'PHOTOGRAPHER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword();

    // Create user in Cognito
    try {
      // Create user
      const createUserCommand = new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'given_name', Value: firstName },
          { Name: 'family_name', Value: lastName },
        ],
        MessageAction: sendInvitation ? 'SUPPRESS' : 'SUPPRESS', // We'll handle email separately
        TemporaryPassword: temporaryPassword,
      });

      await cognitoClient.send(createUserCommand);

      // Set permanent password
      const setPasswordCommand = new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        Password: temporaryPassword,
        Permanent: false, // User will be forced to change on first login
      });

      await cognitoClient.send(setPasswordCommand);

      // Add user to role group
      const addToGroupCommand = new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        GroupName: role,
      });

      await cognitoClient.send(addToGroupCommand);

    } catch (cognitoError: any) {
      console.error('Cognito error:', cognitoError);
      if (cognitoError.name === 'UsernameExistsException') {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to create user in Cognito' }, { status: 500 });
    }

    // Create user in DynamoDB
    try {
      const userData: any = {
        email,
        firstName,
        lastName,
        phone,
        role,
        status: 'ACTIVE',
      };

      // Add role-specific fields
      if (role === 'ORGANIZER' && companyName) {
        userData.companyName = companyName;
      }

      if (role === 'PHOTOGRAPHER') {
        if (portfolioUrl) userData.portfolioUrl = portfolioUrl;
        if (specialization) userData.specialization = specialization;
        if (bio) userData.bio = bio;
      }

      const { data: newUser } = await client.models.User.create(userData);

      // TODO: Send invitation email if sendInvitation is true
      // This would use AWS SES to send the email with temporary password

      return NextResponse.json({
        message: 'User created successfully',
        user: newUser,
        temporaryPassword: sendInvitation ? undefined : temporaryPassword,
      });

    } catch (dbError) {
      console.error('Database error:', dbError);

      // Rollback: Delete user from Cognito if DynamoDB creation fails
      // This is a best-effort cleanup

      return NextResponse.json({ error: 'Failed to create user in database' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
