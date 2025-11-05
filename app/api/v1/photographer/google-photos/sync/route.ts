/**
 * Google Photos Sync Endpoint
 *
 * Imports selected photos from Google Photos into an event
 * - Lists photos from Google Photos based on date range
 * - Downloads selected photos
 * - Uploads to S3 (triggers Lambda for processing)
 * - Creates Photo records in DynamoDB
 */

import { NextRequest, NextResponse } from 'next/server';
import { googlePhotosService } from '@/lib/services/google-photos-service';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { s3Service } from '@/lib/aws/s3';
import { v4 as uuidv4 } from 'uuid';

const client = generateClient<Schema>({ authMode: 'apiKey' });

interface SyncRequest {
  eventId: string;
  startDate?: string; // ISO 8601 date, defaults to event start
  endDate?: string; // ISO 8601 date, defaults to event end
  photoIds?: string[]; // If provided, sync only these photos
  pageToken?: string; // For pagination
  pageSize?: number; // Number of photos per page
}

interface SyncResponse {
  photos?: any[]; // List of photos (when listing)
  nextPageToken?: string; // Pagination token
  imported?: {
    photoId: string;
    googlePhotoId: string;
    filename: string;
    status: string;
  }[]; // Imported photos (when syncing)
  failed?: {
    googlePhotoId: string;
    error: string;
  }[]; // Failed imports
  message: string;
}

/**
 * GET - List photos from Google Photos for preview
 */
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const pageToken = searchParams.get('pageToken') || undefined;
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Get event details
    const { data: event } = await client.models.Event.get({ id: eventId });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify photographer is assigned to this event
    const { data: assignments } = await client.models.PhotographerAssignment.list({
      filter: {
        and: [
          { eventId: { eq: eventId } },
          { photographerId: { eq: userId } }
        ]
      }
    });

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ error: 'Not assigned to this event' }, { status: 403 });
    }

    // Get Google Photos token
    const { data: tokens } = await client.models.GooglePhotosToken.list({
      filter: { userId: { eq: userId } }
    });

    if (!tokens || tokens.length === 0) {
      return NextResponse.json(
        { error: 'Google Photos not connected', code: 'NOT_CONNECTED' },
        { status: 401 }
      );
    }

    let token = tokens[0];

    // Check if token is expired and refresh if needed
    if (googlePhotosService.isTokenExpired(token.expiresAt)) {
      try {
        const refreshedToken = await googlePhotosService.refreshAccessToken(token.refreshToken);

        // Update token in database
        await client.models.GooglePhotosToken.update({
          id: token.id,
          accessToken: refreshedToken.accessToken,
          refreshToken: refreshedToken.refreshToken,
          expiresAt: refreshedToken.expiresAt,
          updatedAt: new Date().toISOString(),
        });

        token = { ...token, ...refreshedToken };
      } catch (error) {
        console.error('Failed to refresh token:', error);
        return NextResponse.json(
          { error: 'Failed to refresh Google Photos token', code: 'TOKEN_REFRESH_FAILED' },
          { status: 401 }
        );
      }
    }

    // Use provided dates or default to event dates
    const searchStartDate = startDate || event.startDateTime;
    const searchEndDate = endDate || event.endDateTime;

    // List photos from Google Photos
    const photosResponse = await googlePhotosService.listPhotos(
      token.accessToken,
      searchStartDate,
      searchEndDate,
      pageToken,
      pageSize
    );

    return NextResponse.json({
      photos: photosResponse.mediaItems || [],
      nextPageToken: photosResponse.nextPageToken,
      message: `Found ${photosResponse.mediaItems?.length || 0} photos`,
    });
  } catch (error: any) {
    console.error('Error listing Google Photos:', error);
    return NextResponse.json(
      { error: 'Failed to list photos from Google Photos', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Import selected photos from Google Photos
 */
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

    // Parse request body
    const body: SyncRequest = await request.json();
    const { eventId, photoIds, startDate, endDate } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Get event details
    const { data: event } = await client.models.Event.get({ id: eventId });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify photographer is assigned to this event
    const { data: assignments } = await client.models.PhotographerAssignment.list({
      filter: {
        and: [
          { eventId: { eq: eventId } },
          { photographerId: { eq: userId } }
        ]
      }
    });

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ error: 'Not assigned to this event' }, { status: 403 });
    }

    // Check photo limit
    const { data: existingPhotos } = await client.models.Photo.list({
      filter: { eventId: { eq: eventId } }
    });

    const currentPhotoCount = existingPhotos?.length || 0;
    const remainingSlots = event.maxPhotos - currentPhotoCount;

    if (!photoIds || photoIds.length === 0) {
      return NextResponse.json({ error: 'No photos selected' }, { status: 400 });
    }

    if (photoIds.length > remainingSlots) {
      return NextResponse.json(
        {
          error: `Event photo limit reached. ${remainingSlots} slots remaining, but trying to import ${photoIds.length} photos`,
          currentCount: currentPhotoCount,
          maxPhotos: event.maxPhotos,
          remaining: remainingSlots
        },
        { status: 400 }
      );
    }

    // Get Google Photos token
    const { data: tokens } = await client.models.GooglePhotosToken.list({
      filter: { userId: { eq: userId } }
    });

    if (!tokens || tokens.length === 0) {
      return NextResponse.json(
        { error: 'Google Photos not connected', code: 'NOT_CONNECTED' },
        { status: 401 }
      );
    }

    let token = tokens[0];

    // Check if token is expired and refresh if needed
    if (googlePhotosService.isTokenExpired(token.expiresAt)) {
      try {
        const refreshedToken = await googlePhotosService.refreshAccessToken(token.refreshToken);

        // Update token in database
        await client.models.GooglePhotosToken.update({
          id: token.id,
          accessToken: refreshedToken.accessToken,
          refreshToken: refreshedToken.refreshToken,
          expiresAt: refreshedToken.expiresAt,
          updatedAt: new Date().toISOString(),
        });

        token = { ...token, ...refreshedToken };
      } catch (error) {
        console.error('Failed to refresh token:', error);
        return NextResponse.json(
          { error: 'Failed to refresh Google Photos token', code: 'TOKEN_REFRESH_FAILED' },
          { status: 401 }
        );
      }
    }

    // Get photographer name
    const { data: photographer } = await client.models.User.get({ id: userId });
    const photographerName = photographer
      ? `${photographer.firstName} ${photographer.lastName}`
      : 'Unknown';

    // Import photos
    const imported = [];
    const failed = [];

    for (const googlePhotoId of photoIds) {
      try {
        // Get photo metadata from Google Photos
        const googlePhoto = await googlePhotosService.getPhotoById(
          token.accessToken,
          googlePhotoId
        );

        // Download photo from Google Photos
        const photoBuffer = await googlePhotosService.downloadPhoto(googlePhoto.baseUrl);

        // Generate unique photo ID
        const photoId = uuidv4();

        // Determine file extension from mime type
        const ext = googlePhoto.mimeType === 'image/png' ? 'png' : 'jpg';
        const filename = googlePhoto.filename || `${photoId}.${ext}`;

        // Upload to S3 (originals folder - will trigger Lambda processing)
        const s3Key = `originals/${eventId}/${photoId}.${ext}`;
        await s3Service.uploadFile(
          s3Key,
          photoBuffer,
          googlePhoto.mimeType,
          {
            googlePhotoId,
            originalFilename: filename,
            importedAt: new Date().toISOString(),
            photographerId: userId,
          }
        );

        // Create photo record in DynamoDB
        const photoData = {
          id: photoId,
          eventId,
          photographerId: userId,
          photographerName,
          originalUrl: s3Service.getPublicUrl(s3Key),
          processedUrl: '', // Will be set by Lambda
          thumbnailUrl: '', // Will be set by Lambda
          fileSize: photoBuffer.length,
          dimensionsWidth: parseInt(googlePhoto.mediaMetadata.width) || 0,
          dimensionsHeight: parseInt(googlePhoto.mediaMetadata.height) || 0,
          capturedAt: googlePhoto.mediaMetadata.creationTime || new Date().toISOString(),
          status: 'UPLOADING' as const,
          faceCount: 0, // Will be set by Lambda
          rekognitionFaceIds: [],
        };

        const { data: photo, errors: photoErrors } = await client.models.Photo.create(photoData);

        if (photoErrors || !photo) {
          console.error('Failed to create photo record:', photoErrors);
          failed.push({
            googlePhotoId,
            error: 'Failed to create photo record',
          });
          continue;
        }

        imported.push({
          photoId,
          googlePhotoId,
          filename,
          status: 'UPLOADING',
        });

      } catch (error: any) {
        console.error(`Failed to import photo ${googlePhotoId}:`, error);
        failed.push({
          googlePhotoId,
          error: error.message || 'Failed to import photo',
        });
      }
    }

    return NextResponse.json({
      imported,
      failed,
      message: `Successfully imported ${imported.length} photo(s). ${failed.length} failed.`,
      currentCount: currentPhotoCount + imported.length,
      maxPhotos: event.maxPhotos,
      remaining: remainingSlots - imported.length,
    });

  } catch (error: any) {
    console.error('Error syncing Google Photos:', error);
    return NextResponse.json(
      { error: 'Failed to sync photos from Google Photos', message: error.message },
      { status: 500 }
    );
  }
}
