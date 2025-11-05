import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all data in parallel
    const [
      { data: events },
      { data: photos },
      { data: sessions },
      { data: users },
    ] = await Promise.all([
      client.models.Event.list(),
      client.models.Photo.list(),
      client.models.Session.list(),
      client.models.User.list(),
    ]);

    // Calculate statistics
    const stats = {
      totalEvents: events?.length || 0,
      activeEvents: events?.filter(e => e.status === 'ACTIVE').length || 0,
      totalPhotos: photos?.length || 0,
      livePhotos: photos?.filter(p => p.status === 'LIVE').length || 0,
      processingPhotos: photos?.filter(p => p.status === 'PROCESSING').length || 0,
      flaggedPhotos: photos?.filter(p => p.status === 'FLAGGED').length || 0,
      totalSessions: sessions?.length || 0,
      totalUsers: users?.length || 0,
      photographers: users?.filter(u => u.role === 'PHOTOGRAPHER').length || 0,
      organizers: users?.filter(u => u.role === 'ORGANIZER').length || 0,
      activeUsers: users?.filter(u => u.status === 'ACTIVE').length || 0,
      suspendedUsers: users?.filter(u => u.status === 'SUSPENDED').length || 0,
    };

    // Event status breakdown
    const eventsByStatus = {
      CREATED: events?.filter(e => e.status === 'CREATED').length || 0,
      PAID: events?.filter(e => e.status === 'PAID').length || 0,
      ACTIVE: events?.filter(e => e.status === 'ACTIVE').length || 0,
      GRACE_PERIOD: events?.filter(e => e.status === 'GRACE_PERIOD').length || 0,
      DOWNLOAD_PERIOD: events?.filter(e => e.status === 'DOWNLOAD_PERIOD').length || 0,
      ARCHIVED: events?.filter(e => e.status === 'ARCHIVED').length || 0,
    };

    // Photo status breakdown
    const photosByStatus = {
      UPLOADING: photos?.filter(p => p.status === 'UPLOADING').length || 0,
      PROCESSING: photos?.filter(p => p.status === 'PROCESSING').length || 0,
      LIVE: photos?.filter(p => p.status === 'LIVE').length || 0,
      FLAGGED: photos?.filter(p => p.status === 'FLAGGED').length || 0,
      DELETED: photos?.filter(p => p.status === 'DELETED').length || 0,
    };

    // Calculate revenue (sum of all paid events)
    const totalRevenue = events
      ?.filter(e => e.paymentStatus === 'PAID')
      .reduce((sum, e) => sum + (e.paymentAmount || 0), 0) || 0;

    const pendingRevenue = events
      ?.filter(e => e.paymentStatus === 'PENDING')
      .reduce((sum, e) => sum + (e.paymentAmount || 0), 0) || 0;

    // Top events by photo count
    const eventPhotoCounts = events?.map(event => ({
      eventId: event.id,
      eventName: event.eventName,
      photoCount: photos?.filter(p => p.eventId === event.id).length || 0,
      status: event.status,
    })) || [];

    const topEvents = eventPhotoCounts
      .sort((a, b) => b.photoCount - a.photoCount)
      .slice(0, 10);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentPhotos = photos?.filter(p => {
      const createdAt = new Date(p.createdAt);
      return createdAt >= sevenDaysAgo;
    }).length || 0;

    const recentSessions = sessions?.filter(s => {
      const createdAt = new Date(s.createdAt);
      return createdAt >= sevenDaysAgo;
    }).length || 0;

    return NextResponse.json({
      success: true,
      stats,
      eventsByStatus,
      photosByStatus,
      revenue: {
        total: totalRevenue,
        pending: pendingRevenue,
      },
      topEvents,
      recentActivity: {
        photosLast7Days: recentPhotos,
        sessionsLast7Days: recentSessions,
      },
      generatedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Analytics overview error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
