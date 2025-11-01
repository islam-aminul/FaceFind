import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import '@/lib/amplify-config';

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = params;
    const body = await request.json();
    const { photographerId } = body;

    if (!photographerId) {
      return NextResponse.json(
        { error: 'photographerId is required' },
        { status: 400 }
      );
    }

    // Verify event exists
    const eventResult = await client.models.Event.get({ id: eventId });
    if (!eventResult.data) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Verify photographer exists and has PHOTOGRAPHER role
    const photographerResult = await client.models.User.get({ id: photographerId });
    if (!photographerResult.data) {
      return NextResponse.json(
        { error: 'Photographer not found' },
        { status: 404 }
      );
    }

    if (photographerResult.data.role !== 'PHOTOGRAPHER') {
      return NextResponse.json(
        { error: 'User is not a photographer' },
        { status: 400 }
      );
    }

    // Check if assignment already exists
    const existingAssignments = await client.models.PhotographerAssignment.list({
      filter: {
        eventId: { eq: eventId },
        photographerId: { eq: photographerId }
      }
    });

    if (existingAssignments.data && existingAssignments.data.length > 0) {
      return NextResponse.json(
        { error: 'Photographer already assigned to this event' },
        { status: 400 }
      );
    }

    // Create assignment
    const assignmentResult = await client.models.PhotographerAssignment.create({
      eventId,
      photographerId,
      assignedAt: new Date().toISOString(),
    });

    if (assignmentResult.errors) {
      console.error('Assignment creation errors:', assignmentResult.errors);
      return NextResponse.json(
        { error: 'Failed to assign photographer', details: assignmentResult.errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      assignment: assignmentResult.data,
      photographer: photographerResult.data,
    });
  } catch (error: any) {
    console.error('Photographer assignment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign photographer' },
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

    const { id: eventId } = params;
    const { searchParams } = new URL(request.url);
    const photographerId = searchParams.get('photographerId');

    if (!photographerId) {
      return NextResponse.json(
        { error: 'photographerId query parameter is required' },
        { status: 400 }
      );
    }

    // Find the assignment
    const assignmentsResult = await client.models.PhotographerAssignment.list({
      filter: {
        eventId: { eq: eventId },
        photographerId: { eq: photographerId }
      }
    });

    if (!assignmentsResult.data || assignmentsResult.data.length === 0) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    const assignment = assignmentsResult.data[0];

    // Delete the assignment
    const deleteResult = await client.models.PhotographerAssignment.delete({
      id: assignment.id
    });

    if (deleteResult.errors) {
      console.error('Assignment deletion errors:', deleteResult.errors);
      return NextResponse.json(
        { error: 'Failed to remove photographer', details: deleteResult.errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Photographer removed from event successfully',
    });
  } catch (error: any) {
    console.error('Photographer removal error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove photographer' },
      { status: 500 }
    );
  }
}
