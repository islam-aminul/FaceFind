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

    // Extract only valid updateable fields
    const {
      eventName,
      organizerId,
      startDateTime,
      endDateTime,
      gracePeriodDays,
      retentionPeriodDays,
      location,
      estimatedAttendees,
      maxPhotos,
      confidenceThreshold,
      photoResizeWidth,
      photoResizeHeight,
      photoQuality,
      watermarkElements,
      eventLogoUrl,
      welcomeMessage,
      welcomePictureUrl,
      qrCodeUrl,
      paymentStatus,
      paymentAmount,
      status,
      rekognitionCollectionId,
    } = body;

    // Build update object with only provided fields
    const updateData: any = { id };

    if (eventName !== undefined) updateData.eventName = eventName;
    if (organizerId !== undefined) updateData.organizerId = organizerId;
    if (startDateTime !== undefined) {
      // Convert datetime-local format to ISO datetime
      updateData.startDateTime = new Date(startDateTime).toISOString();
    }
    if (endDateTime !== undefined) {
      // Convert datetime-local format to ISO datetime
      updateData.endDateTime = new Date(endDateTime).toISOString();
    }
    if (gracePeriodDays !== undefined) updateData.gracePeriodDays = gracePeriodDays;
    if (retentionPeriodDays !== undefined) updateData.retentionPeriodDays = retentionPeriodDays;
    if (location !== undefined) updateData.location = location;
    if (estimatedAttendees !== undefined) updateData.estimatedAttendees = estimatedAttendees;
    if (maxPhotos !== undefined) updateData.maxPhotos = maxPhotos;
    if (confidenceThreshold !== undefined) updateData.confidenceThreshold = confidenceThreshold;
    if (photoResizeWidth !== undefined) updateData.photoResizeWidth = photoResizeWidth;
    if (photoResizeHeight !== undefined) updateData.photoResizeHeight = photoResizeHeight;
    if (photoQuality !== undefined) updateData.photoQuality = photoQuality;
    if (watermarkElements !== undefined) updateData.watermarkElements = watermarkElements;
    if (eventLogoUrl !== undefined) updateData.eventLogoUrl = eventLogoUrl;
    if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage;
    if (welcomePictureUrl !== undefined) updateData.welcomePictureUrl = welcomePictureUrl;
    if (qrCodeUrl !== undefined) updateData.qrCodeUrl = qrCodeUrl;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (paymentAmount !== undefined) updateData.paymentAmount = paymentAmount;
    if (status !== undefined) updateData.status = status;
    if (rekognitionCollectionId !== undefined) updateData.rekognitionCollectionId = rekognitionCollectionId;

    // Update event
    const result = await client.models.Event.update(updateData);

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

    // Get event to check status
    const { data: event } = await client.models.Event.get({ id });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if event is active or has status beyond CREATED
    if (event.status !== 'CREATED') {
      return NextResponse.json(
        {
          error: 'Cannot delete event',
          reason: `Event cannot be deleted because it has status: ${event.status}. Only events with CREATED status can be deleted.`,
          currentStatus: event.status
        },
        { status: 400 }
      );
    }

    // Check if photos exist for this event
    const { data: photos } = await client.models.Photo.list({
      filter: { eventId: { eq: id } }
    });

    if (photos && photos.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete event',
          reason: `Event has ${photos.length} photo(s) associated with it. Please delete all photos before deleting the event.`,
          photoCount: photos.length
        },
        { status: 400 }
      );
    }

    // Check if sessions exist (attendees have scanned faces)
    const { data: sessions } = await client.models.Session.list({
      filter: { eventId: { eq: id } }
    });

    if (sessions && sessions.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete event',
          reason: `Event has ${sessions.length} active session(s). Cannot delete event with attendee data.`,
          sessionCount: sessions.length
        },
        { status: 400 }
      );
    }

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
