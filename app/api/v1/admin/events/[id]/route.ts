import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import '@/lib/amplify-config';

const client = generateClient<Schema>();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get event details
    const result = await client.models.Event.get({ id });

    if (result.errors) {
      console.error('Event fetch errors:', result.errors);
      return NextResponse.json(
        { error: 'Failed to fetch event', details: result.errors },
        { status: 500 }
      );
    }

    if (!result.data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get organizer details
    const organizerResult = await client.models.User.get({
      id: result.data.organizerId
    });

    // Get assigned photographers
    const assignmentsResult = await client.models.PhotographerAssignment.list({
      filter: { eventId: { eq: id } }
    });

    const photographerIds = assignmentsResult.data?.map(a => a.photographerId) || [];
    const photographers = [];

    for (const photographerId of photographerIds) {
      const photographerResult = await client.models.User.get({ id: photographerId });
      if (photographerResult.data) {
        photographers.push(photographerResult.data);
      }
    }

    return NextResponse.json({
      success: true,
      event: result.data,
      organizer: organizerResult.data,
      photographers,
    });
  } catch (error: any) {
    console.error('Event fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    // Update event
    const result = await client.models.Event.update({
      id,
      ...body,
    });

    if (result.errors) {
      console.error('Event update errors:', result.errors);
      return NextResponse.json(
        { error: 'Failed to update event', details: result.errors },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // TODO: Add validation - cannot delete if photos exist or event is active

    const result = await client.models.Event.delete({ id });

    if (result.errors) {
      console.error('Event deletion errors:', result.errors);
      return NextResponse.json(
        { error: 'Failed to delete event', details: result.errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error: any) {
    console.error('Event deletion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete event' },
      { status: 500 }
    );
  }
}
