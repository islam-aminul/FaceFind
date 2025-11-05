'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AnalyticsData {
  stats: {
    totalEvents: number;
    activeEvents: number;
    totalPhotos: number;
    livePhotos: number;
    processingPhotos: number;
    flaggedPhotos: number;
    totalSessions: number;
    totalUsers: number;
    photographers: number;
    organizers: number;
    activeUsers: number;
    suspendedUsers: number;
  };
  eventsByStatus: Record<string, number>;
  photosByStatus: Record<string, number>;
  revenue: {
    total: number;
    pending: number;
  };
  topEvents: Array<{
    eventId: string;
    eventName: string;
    photoCount: number;
    status: string;
  }>;
  recentActivity: {
    photosLast7Days: number;
    sessionsLast7Days: number;
  };
  generatedAt: string;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }

    fetchAnalytics(token);
  }, [router]);

  const fetchAnalytics = async (token: string) => {
    try {
      const response = await fetch('/api/v1/admin/analytics/overview', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color = 'blue' }: any) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold text-${color}-600 mt-2`}>{value.toLocaleString()}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 text-sm mb-2 block">
            ← Back to Dashboard
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              {analytics && (
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: {new Date(analytics.generatedAt).toLocaleString()}
                </p>
              )}
            </div>
            <button
              onClick={() => fetchAnalytics(localStorage.getItem('token') || '')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        ) : !analytics ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">Failed to load analytics data</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Revenue Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">💰 Revenue</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title="Total Revenue" value={formatCurrency(analytics.revenue.total)} icon="💵" color="green" />
                <StatCard title="Pending Revenue" value={formatCurrency(analytics.revenue.pending)} icon="⏳" color="yellow" />
              </div>
            </div>

            {/* Overview Stats */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Events" value={analytics.stats.totalEvents} icon="📅" color="blue" />
                <StatCard title="Active Events" value={analytics.stats.activeEvents} icon="🟢" color="green" />
                <StatCard title="Total Photos" value={analytics.stats.totalPhotos} icon="📸" color="purple" />
                <StatCard title="Live Photos" value={analytics.stats.livePhotos} icon="✅" color="green" />
              </div>
            </div>

            {/* Photo Status */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">📷 Photos by Status</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <StatCard title="Uploading" value={analytics.photosByStatus.UPLOADING} icon="⬆️" color="gray" />
                <StatCard title="Processing" value={analytics.photosByStatus.PROCESSING} icon="⚙️" color="blue" />
                <StatCard title="Live" value={analytics.photosByStatus.LIVE} icon="✅" color="green" />
                <StatCard title="Flagged" value={analytics.photosByStatus.FLAGGED} icon="🚩" color="red" />
                <StatCard title="Deleted" value={analytics.photosByStatus.DELETED} icon="🗑️" color="gray" />
              </div>
            </div>

            {/* Event Status */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">📅 Events by Status</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard title="Created" value={analytics.eventsByStatus.CREATED} icon="📝" color="gray" />
                <StatCard title="Paid" value={analytics.eventsByStatus.PAID} icon="💳" color="green" />
                <StatCard title="Active" value={analytics.eventsByStatus.ACTIVE} icon="🟢" color="blue" />
                <StatCard title="Grace Period" value={analytics.eventsByStatus.GRACE_PERIOD} icon="⏰" color="yellow" />
                <StatCard title="Download Period" value={analytics.eventsByStatus.DOWNLOAD_PERIOD} icon="⬇️" color="orange" />
                <StatCard title="Archived" value={analytics.eventsByStatus.ARCHIVED} icon="📦" color="gray" />
              </div>
            </div>

            {/* User Stats */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">👥 Users</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Users" value={analytics.stats.totalUsers} icon="👤" color="blue" />
                <StatCard title="Photographers" value={analytics.stats.photographers} icon="📸" color="purple" />
                <StatCard title="Organizers" value={analytics.stats.organizers} icon="🎯" color="green" />
                <StatCard title="Suspended" value={analytics.stats.suspendedUsers} icon="⛔" color="red" />
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">🔥 Recent Activity (Last 7 Days)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title="Photos Uploaded" value={analytics.recentActivity.photosLast7Days} icon="📸" color="blue" />
                <StatCard title="Face Scans" value={analytics.recentActivity.sessionsLast7Days} icon="👁️" color="purple" />
              </div>
            </div>

            {/* Top Events */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">🏆 Top Events by Photo Count</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo Count</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analytics.topEvents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                          No events yet
                        </td>
                      </tr>
                    ) : (
                      analytics.topEvents.map((event, index) => (
                        <tr key={event.eventId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {event.eventName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              event.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                              event.status === 'PAID' ? 'bg-blue-100 text-blue-800' :
                              event.status === 'CREATED' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {event.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {event.photoCount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Link
                              href={`/admin/events/${event.eventId}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
