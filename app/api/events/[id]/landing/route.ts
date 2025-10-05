import { NextRequest, NextResponse } from 'next/server';
import { eventService } from '@/lib/api/events';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await eventService.getEventById(params.id);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Return only public event information
    const publicEvent = {
      eventId: event.eventId,
      eventName: event.eventName,
      eventLogoUrl: event.eventLogoUrl,
      welcomeMessage: event.welcomeMessage,
      welcomePictureUrl: event.welcomePictureUrl,
      status: event.status,
    };

    return NextResponse.json(publicEvent);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
