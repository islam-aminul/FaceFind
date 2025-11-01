import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import '@/lib/amplify-config';

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

export async function PUT(
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
    const body = await request.json();
    const { welcomeMessage, welcomePictureUrl, eventLogoUrl } = body;

    // Fetch event to verify ownership
    const eventResult = await client.models.Event.get({ id });

    if (eventResult.errors || !eventResult.data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (eventResult.data.organizerId !== organizerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update landing page fields
    const updateData: any = {};
    if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage;
    if (welcomePictureUrl !== undefined) updateData.welcomePictureUrl = welcomePictureUrl;
    if (eventLogoUrl !== undefined) updateData.eventLogoUrl = eventLogoUrl;

    const result = await client.models.Event.update({
      id,
      ...updateData,
    });

    if (result.errors) {
      console.error('Event update errors:', result.errors);
      return NextResponse.json(
        { error: 'Failed to update event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      event: result.data,
    });
  } catch (error: any) {
    console.error('Event update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update event' },
      { status: 500 }
    );
  }
}
