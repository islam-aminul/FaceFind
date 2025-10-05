#!/usr/bin/env ts-node

/**
 * Script to create a test user in AWS Cognito
 * Usage: npx ts-node scripts/create-test-user.ts
 */

import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';
import * as fs from 'fs';
import * as path from 'path';

const outputs = JSON.parse(fs.readFileSync(path.join(__dirname, '../amplify_outputs.json'), 'utf-8'));

const client = new CognitoIdentityProviderClient({
  region: outputs.auth.aws_region
});

async function createTestUser() {
  const email = 'test@facefind.com';
  const password = 'Test123!@#';
  const userPoolId = outputs.auth.user_pool_id;

  try {
    console.log('Creating test user...');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User Pool:', userPoolId);

    // Create user
    const createUserResponse = await client.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'given_name', Value: 'Test' },
          { Name: 'family_name', Value: 'User' },
          { Name: 'custom:role', Value: 'ADMIN' },
        ],
        MessageAction: 'SUPPRESS',
      })
    );

    console.log('✅ User created successfully');

    // Set permanent password
    await client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: email,
        Password: password,
        Permanent: true,
      })
    );

    console.log('✅ Password set successfully');
    console.log('\n🎉 Test user ready!');
    console.log(`\nLogin credentials:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`\nYou can now login at: http://localhost:3000/login`);
  } catch (error: any) {
    if (error.name === 'UsernameExistsException') {
      console.log('ℹ️  User already exists. Updating password...');

      try {
        await client.send(
          new AdminSetUserPasswordCommand({
            UserPoolId: userPoolId,
            Username: email,
            Password: password,
            Permanent: true,
          })
        );
        console.log('✅ Password updated successfully');
        console.log(`\nLogin credentials:`);
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
      } catch (updateError: any) {
        console.error('❌ Error updating password:', updateError.message);
        process.exit(1);
      }
    } else {
      console.error('❌ Error creating user:', error.message);
      console.error('Full error:', error);
      process.exit(1);
    }
  }
}

createTestUser();
