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

    const photographerId = request.headers.get('x-user-id');
    if (!photographerId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const { id: eventId } = params;

    // Verify photographer is assigned to this event
    const assignmentResult = await client.models.PhotographerAssignment.list({
      filter: {
        eventId: { eq: eventId },
        photographerId: { eq: photographerId }
      }
    });

    if (assignmentResult.errors || !assignmentResult.data || assignmentResult.data.length === 0) {
      return NextResponse.json({ error: 'Not assigned to this event' }, { status: 403 });
    }

    // Fetch event details
    const eventResult = await client.models.Event.get({ id: eventId });

    if (eventResult.errors || !eventResult.data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      event: eventResult.data,
    });
  } catch (error: any) {
    console.error('Event fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch event' },
      { status: 500 }
    );
  }
}
