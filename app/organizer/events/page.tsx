'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Event {
  id: string;
  eventName: string;
  startDateTime: string;
  endDateTime: string;
  location: string;
  estimatedAttendees: number;
  maxPhotos: number;
  paymentStatus: string;
  status: string;
  qrCodeUrl?: string;
}

export default function OrganizerEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'ORGANIZER') {
      router.push('/login');
      return;
    }

    setUserId(user.id);
    fetchEvents(token, user.id);
  }, [router]);

  const fetchEvents = async (token: string, userId: string) => {
    try {
      const response = await fetch('/api/v1/organizer/events/list', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: any = {
      CREATED: 'bg-gray-100 text-gray-800',
      PAID: 'bg-green-100 text-green-800',
      ACTIVE: 'bg-blue-100 text-blue-800',
      GRACE_PERIOD: 'bg-yellow-100 text-yellow-800',
      DOWNLOAD_PERIOD: 'bg-purple-100 text-purple-800',
      ARCHIVED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const downloadQR = (event: Event) => {
    if (event.qrCodeUrl) {
      const link = document.createElement('a');
      link.href = event.qrCodeUrl;
      link.download = `${event.eventName}-QR.png`;
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <Link href="/organizer" className="text-blue-600 hover:text-blue-800 text-sm mb-1 block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">My Events</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No events yet</h3>
            <p className="text-gray-600">Your events will appear here once created by admin</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {events.map((event) => (
              <div key={event.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{event.eventName}</h3>
                    <p className="text-gray-600 text-sm">📍 {event.location}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(event.status)}`}>
                    {event.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Start Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(event.startDateTime).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">End Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(event.endDateTime).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Attendees</p>
                    <p className="text-sm font-medium text-gray-900">{event.estimatedAttendees}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Max Photos</p>
                    <p className="text-sm font-medium text-gray-900">{event.maxPhotos}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Link
                    href={`/organizer/events/${event.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm"
                  >
                    View Details
                  </Link>
                  <Link
                    href={`/organizer/events/${event.id}/photos`}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm"
                  >
                    View Photos
                  </Link>
                  <Link
                    href={`/organizer/events/${event.id}/customize`}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition text-sm"
                  >
                    Customize
                  </Link>
                  {event.qrCodeUrl && (
                    <button
                      onClick={() => downloadQR(event)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition text-sm"
                    >
                      📱 Download QR
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
