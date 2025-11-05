/**
 * Google Photos OAuth Authorization Endpoint
 *
 * Initiates the OAuth flow by generating an authorization URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { googlePhotosService } from '@/lib/services/google-photos-service';

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user ID from headers (set by middleware or authentication layer)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 400 }
      );
    }

    // Generate authorization URL
    const { authUrl, state } = googlePhotosService.generateAuthUrl(userId);

    return NextResponse.json({
      authUrl,
      state,
      message: 'Redirect user to authUrl to authorize Google Photos access',
    });
  } catch (error: any) {
    console.error('Error generating Google Photos auth URL:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate authorization URL',
        message: error.message
      },
      { status: 500 }
    );
  }
}
