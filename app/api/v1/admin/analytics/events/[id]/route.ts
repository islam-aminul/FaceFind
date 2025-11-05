import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

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

    const eventId = params.id;

    // Fetch event data
    const { data: event } = await client.models.Event.get({ id: eventId });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch related data in parallel
    const [
      { data: photos },
      { data: sessions },
      { data: assignments },
    ] = await Promise.all([
      client.models.Photo.list({ filter: { eventId: { eq: eventId } } }),
      client.models.Session.list({ filter: { eventId: { eq: eventId } } }),
      client.models.PhotographerAssignment.list({ filter: { eventId: { eq: eventId } } }),
    ]);

    // Calculate event-specific stats
    const stats = {
      totalPhotos: photos?.length || 0,
      livePhotos: photos?.filter(p => p.status === 'LIVE').length || 0,
      processingPhotos: photos?.filter(p => p.status === 'PROCESSING').length || 0,
      flaggedPhotos: photos?.filter(p => p.status === 'FLAGGED').length || 0,
      totalSessions: sessions?.length || 0,
      totalFaces: photos?.reduce((sum, p) => sum + (p.faceCount || 0), 0) || 0,
      assignedPhotographers: assignments?.length || 0,
    };

    // Photos by photographer
    const photographerStats = {} as Record<string, { count: number; name: string }>;
    photos?.forEach(photo => {
      const id = photo.photographerId;
      if (!photographerStats[id]) {
        photographerStats[id] = {
          count: 0,
          name: photo.photographerName || 'Unknown',
        };
      }
      photographerStats[id].count++;
    });

    const photosByPhotographer = Object.entries(photographerStats).map(([id, data]) => ({
      photographerId: id,
      photographerName: data.name,
      photoCount: data.count,
    })).sort((a, b) => b.photoCount - a.photoCount);

    // Session activity timeline (group by day)
    const sessionsByDay = {} as Record<string, number>;
    sessions?.forEach(session => {
      const date = new Date(session.createdAt).toISOString().split('T')[0];
      sessionsByDay[date] = (sessionsByDay[date] || 0) + 1;
    });

    const sessionTimeline = Object.entries(sessionsByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Photo upload timeline (group by day)
    const photosByDay = {} as Record<string, number>;
    photos?.forEach(photo => {
      const date = new Date(photo.createdAt).toISOString().split('T')[0];
      photosByDay[date] = (photosByDay[date] || 0) + 1;
    });

    const uploadTimeline = Object.entries(photosByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Engagement metrics
    const sessionsWithMatches = sessions?.filter(s =>
      s.matchedPhotoIds && s.matchedPhotoIds.length > 0
    ).length || 0;

    const matchRate = stats.totalSessions > 0
      ? (sessionsWithMatches / stats.totalSessions) * 100
      : 0;

    const avgPhotosPerSession = stats.totalSessions > 0
      ? stats.totalPhotos / stats.totalSessions
      : 0;

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        name: event.eventName,
        status: event.status,
        startDate: event.startDateTime,
        endDate: event.endDateTime,
        location: event.location,
      },
      stats,
      photosByPhotographer,
      sessionTimeline,
      uploadTimeline,
      engagement: {
        matchRate: Math.round(matchRate * 100) / 100,
        sessionsWithMatches,
        avgPhotosPerSession: Math.round(avgPhotosPerSession * 100) / 100,
      },
      generatedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Event analytics error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch event analytics' },
      { status: 500 }
    );
  }
}
