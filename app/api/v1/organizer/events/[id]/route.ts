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

    const { id } = params;

    // Fetch event
    const result = await client.models.Event.get({ id });

    if (result.errors) {
      console.error('Event fetch errors:', result.errors);
      return NextResponse.json(
        { error: 'Failed to fetch event' },
        { status: 500 }
      );
    }

    const event = result.data;

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify that this event belongs to the organizer
    if (event.organizerId !== organizerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error: any) {
    console.error('Event fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch event' },
      { status: 500 }
    );
  }
}
