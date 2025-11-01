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
  status: string;
}

export default function PhotographerEventsPage() {
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
    if (user.role !== 'PHOTOGRAPHER') {
      router.push('/login');
      return;
    }

    setUserId(user.id);
    fetchEvents(token, user.id);
  }, [router]);

  const fetchEvents = async (token: string, userId: string) => {
    try {
      const response = await fetch('/api/v1/photographer/events/list', {
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

  const isEventActive = (event: Event) => {
    const now = new Date();
    const start = new Date(event.startDateTime);
    const end = new Date(event.endDateTime);
    return now >= start && now <= end;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <Link href="/photographer" className="text-blue-600 hover:text-blue-800 text-sm mb-1 block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">My Assigned Events</h1>
          </div>
          <Link
            href="/photographer/portfolio"
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
          >
            Edit Portfolio
          </Link>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No assigned events yet</h3>
            <p className="text-gray-600">Events will appear here once admin assigns you</p>
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
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(event.status)}`}>
                      {event.status}
                    </span>
                    {isEventActive(event) && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        LIVE NOW
                      </span>
                    )}
                  </div>
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
                    href={`/photographer/events/${event.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm"
                  >
                    View Details
                  </Link>
                  <Link
                    href={`/photographer/events/${event.id}/photos`}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm"
                  >
                    View Photos
                  </Link>
                  <Link
                    href={`/photographer/events/${event.id}/upload`}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition text-sm"
                  >
                    📤 Upload Photos
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
