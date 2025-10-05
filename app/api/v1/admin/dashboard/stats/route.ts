import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import '@/lib/amplify-config';

const client = generateClient<Schema>();

export async function GET(request: NextRequest) {
  try {
    // Get auth token from headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all data in parallel
    const [usersResult, eventsResult, photosResult] = await Promise.all([
      client.models.User.list(),
      client.models.Event.list(),
      client.models.Photo.list(),
    ]);

    const users = usersResult.data || [];
    const events = eventsResult.data || [];
    const photos = photosResult.data || [];

    // Calculate stats
    const totalUsers = users.length;
    const usersByRole = {
      ADMIN: users.filter(u => u.role === 'ADMIN').length,
      ORGANIZER: users.filter(u => u.role === 'ORGANIZER').length,
      PHOTOGRAPHER: users.filter(u => u.role === 'PHOTOGRAPHER').length,
    };

    const totalEvents = events.length;
    const activeEvents = events.filter(e =>
      e.status === 'ACTIVE' || e.status === 'GRACE_PERIOD'
    ).length;
    const paidEvents = events.filter(e => e.paymentStatus === 'PAID').length;

    const totalPhotos = photos.length;
    const livePhotos = photos.filter(p => p.status === 'LIVE').length;
    const flaggedPhotos = photos.filter(p => p.status === 'FLAGGED').length;

    // Calculate storage (sum of file sizes in GB)
    const totalStorage = photos.reduce((sum, p) => sum + (p.fileSize || 0), 0);
    const storageGB = (totalStorage / (1024 * 1024 * 1024)).toFixed(2);

    // Recent activity (last 5 events)
    const recentEvents = events
      .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
      .slice(0, 5)
      .map(e => ({
        id: e.id,
        name: e.eventName,
        status: e.status,
        createdAt: e.createdAt,
      }));

    return NextResponse.json({
      users: {
        total: totalUsers,
        byRole: usersByRole,
      },
      events: {
        total: totalEvents,
        active: activeEvents,
        paid: paidEvents,
      },
      photos: {
        total: totalPhotos,
        live: livePhotos,
        flagged: flaggedPhotos,
      },
      storage: {
        totalGB: parseFloat(storageGB),
        totalBytes: totalStorage,
      },
      recentActivity: recentEvents,
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
