import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import '@/lib/amplify-config';

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizerId = request.headers.get('x-user-id');
    if (!organizerId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const { id: eventId } = params;

    // Verify event ownership
    const eventResult = await client.models.Event.get({ id: eventId });

    if (eventResult.errors || !eventResult.data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (eventResult.data.organizerId !== organizerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all photos for this event
    const photosResult = await client.models.Photo.list({
      filter: {
        eventId: { eq: eventId }
      }
    });

    if (photosResult.errors) {
      console.error('Photos fetch errors:', photosResult.errors);
      return NextResponse.json(
        { error: 'Failed to fetch photos' },
        { status: 500 }
      );
    }

    const photos = photosResult.data || [];

    // Sort by upload date (newest first)
    const sortedPhotos = photos.sort((a, b) =>
      new Date(b.uploadedAt || '').getTime() - new Date(a.uploadedAt || '').getTime()
    );

    return NextResponse.json({
      success: true,
      photos: sortedPhotos,
      total: photos.length,
    });
  } catch (error: any) {
    console.error('Photos fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}
