/**
 * Google Photos Disconnect Endpoint
 *
 * Revokes Google Photos access and removes stored tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>({ authMode: 'apiKey' });

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    // Get user's Google Photos token
    const { data: tokens } = await client.models.GooglePhotosToken.list({
      filter: { userId: { eq: userId } }
    });

    if (!tokens || tokens.length === 0) {
      return NextResponse.json(
        { error: 'Google Photos not connected' },
        { status: 404 }
      );
    }

    // Revoke token with Google (best effort - don't fail if it doesn't work)
    const token = tokens[0];
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${token.accessToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    } catch (error) {
      console.warn('Failed to revoke token with Google:', error);
      // Continue anyway to delete local token
    }

    // Delete token from database
    await client.models.GooglePhotosToken.delete({ id: token.id });

    return NextResponse.json({
      success: true,
      message: 'Google Photos disconnected successfully',
    });

  } catch (error: any) {
    console.error('Error disconnecting Google Photos:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Google Photos', message: error.message },
      { status: 500 }
    );
  }
}
