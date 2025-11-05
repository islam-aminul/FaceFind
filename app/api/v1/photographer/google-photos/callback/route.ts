/**
 * Google Photos OAuth Callback Endpoint
 *
 * Handles the OAuth redirect from Google after user authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { googlePhotosService } from '@/lib/services/google-photos-service';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle user denial or error
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(
        new URL('/photographer/settings?google_photos_error=access_denied', request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/photographer/settings?google_photos_error=invalid_request', request.url)
      );
    }

    // Parse state to get user ID
    let userId: string;
    try {
      userId = googlePhotosService.parseStateToken(state);
    } catch (error) {
      console.error('Invalid state token:', error);
      return NextResponse.redirect(
        new URL('/photographer/settings?google_photos_error=invalid_state', request.url)
      );
    }

    // Exchange authorization code for tokens
    const tokenData = await googlePhotosService.exchangeCodeForToken(code);

    // Store tokens in DynamoDB
    const client = generateClient<Schema>({ authMode: 'apiKey' });

    // Check if token already exists for this user
    const existingTokens = await client.models.GooglePhotosToken.list({
      filter: { userId: { eq: userId } },
    });

    const now = new Date().toISOString();

    if (existingTokens.data.length > 0) {
      // Update existing token
      const existingToken = existingTokens.data[0];
      await client.models.GooglePhotosToken.update({
        id: existingToken.id,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt,
        scope: tokenData.scope,
        tokenType: tokenData.tokenType,
        updatedAt: now,
      });
    } else {
      // Create new token
      await client.models.GooglePhotosToken.create({
        userId,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt,
        scope: tokenData.scope,
        tokenType: tokenData.tokenType,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Redirect back to settings with success message
    return NextResponse.redirect(
      new URL('/photographer/settings?google_photos_success=true', request.url)
    );
  } catch (error) {
    console.error('Error in Google Photos OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/photographer/settings?google_photos_error=server_error', request.url)
    );
  }
}
