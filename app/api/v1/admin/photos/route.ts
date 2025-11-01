import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

// GET - List all photos with filters
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const eventId = searchParams.get('eventId');
    const photographerId = searchParams.get('photographerId');
    const flaggedOnly = searchParams.get('flaggedOnly') === 'true';

    // Build filter
    const filters: any[] = [];

    if (status) {
      filters.push({ status: { eq: status } });
    }

    if (eventId) {
      filters.push({ eventId: { eq: eventId } });
    }

    if (photographerId) {
      filters.push({ photographerId: { eq: photographerId } });
    }

    if (flaggedOnly) {
      filters.push({ status: { eq: 'FLAGGED' } });
    }

    // Fetch photos
    const { data: photos } = await client.models.Photo.list({
      filter: filters.length > 0 ? { and: filters } : undefined,
    });

    // Fetch related event and photographer data
    const photosWithDetails = await Promise.all(
      (photos || []).map(async (photo) => {
        const { data: event } = await client.models.Event.get({ id: photo.eventId });
        const { data: photographer } = await client.models.User.get({ id: photo.photographerId });

        return {
          ...photo,
          eventName: event?.eventName || 'Unknown Event',
          photographerName: photographer
            ? `${photographer.firstName} ${photographer.lastName}`
            : photo.photographerName || 'Unknown',
        };
      })
    );

    return NextResponse.json({
      success: true,
      photos: photosWithDetails,
      count: photosWithDetails.length,
    });

  } catch (error: any) {
    console.error('Photos list error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}
