import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import '@/lib/amplify-config';

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const photographerId = request.headers.get('x-user-id');
    if (!photographerId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    // Fetch photographer assignments
    const assignmentsResult = await client.models.PhotographerAssignment.list({
      filter: {
        photographerId: { eq: photographerId }
      }
    });

    if (assignmentsResult.errors) {
      console.error('Assignments fetch errors:', assignmentsResult.errors);
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      );
    }

    const assignments = assignmentsResult.data || [];

    // Fetch event details for each assignment
    const eventPromises = assignments.map(async (assignment) => {
      const eventResult = await client.models.Event.get({ id: assignment.eventId });
      return eventResult.data;
    });

    const events = await Promise.all(eventPromises);
    const validEvents = events.filter(e => e !== null);

    // Sort by start date (newest first)
    const sortedEvents = validEvents.sort((a, b) =>
      new Date(b!.startDateTime || '').getTime() - new Date(a!.startDateTime || '').getTime()
    );

    return NextResponse.json({
      success: true,
      events: sortedEvents,
      total: validEvents.length,
    });
  } catch (error: any) {
    console.error('Event list error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
