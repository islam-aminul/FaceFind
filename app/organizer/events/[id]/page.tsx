'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Event {
  id: string;
  eventName: string;
  organizerId: string;
  startDateTime: string;
  endDateTime: string;
  location: string;
  estimatedAttendees: number;
  maxPhotos: number;
  gracePeriodDays: number;
  retentionPeriodDays: number;
  confidenceThreshold: number;
  photoResizeWidth?: number;
  photoResizeHeight?: number;
  photoQuality?: number;
  watermarkElements?: string[];
  eventLogoUrl?: string;
  welcomeMessage?: string;
  welcomePictureUrl?: string;
  qrCodeUrl?: string;
  paymentStatus: string;
  paymentAmount: number;
  status: string;
  createdAt: string;
}

export default function OrganizerEventDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
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
    fetchEvent(token, user.id);
  }, [router, eventId]);

  const fetchEvent = async (token: string, userId: string) => {
    try {
      const response = await fetch(`/api/v1/organizer/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvent(data.event);
      } else {
        router.push('/organizer/events');
      }
    } catch (error) {
      console.error('Failed to fetch event:', error);
      router.push('/organizer/events');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (event?.qrCodeUrl) {
      const link = document.createElement('a');
      link.href = event.qrCodeUrl;
      link.download = `${event.eventName}-QR.png`;
      link.click();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading event...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Event not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/organizer/events" className="text-blue-600 hover:text-blue-800 text-sm mb-2 block">
            ← Back to Events
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{event.eventName}</h1>
              <p className="text-gray-600 mt-1">📍 {event.location}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadge(event.status)}`}>
              {event.status}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex gap-4 flex-wrap">
            <Link
              href={`/organizer/events/${eventId}/photos`}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
            >
              📸 View All Photos
            </Link>
            <Link
              href={`/organizer/events/${eventId}/customize`}
              className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
            >
              ✏️ Customize Landing Page
            </Link>
            {event.qrCodeUrl && (
              <button
                onClick={downloadQR}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                📱 Download QR Code
              </button>
            )}
            <Link
              href={`/event/${eventId}`}
              target="_blank"
              className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
            >
              🔗 Preview Landing Page
            </Link>
          </div>
        </div>

        {/* Event Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
              <p className="text-gray-900">{new Date(event.startDateTime).toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
              <p className="text-gray-900">{new Date(event.endDateTime).toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Attendees</label>
              <p className="text-gray-900">{event.estimatedAttendees}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Photos</label>
              <p className="text-gray-900">{event.maxPhotos}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period</label>
              <p className="text-gray-900">{event.gracePeriodDays} days</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Retention Period</label>
              <p className="text-gray-900">{event.retentionPeriodDays} days</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <p className="text-gray-900">
                <span className={`px-3 py-1 rounded-full text-xs ${event.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                  {event.paymentStatus}
                </span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
              <p className="text-gray-900 font-semibold">₹{event.paymentAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Landing Page Preview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Landing Page Content</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {event.eventLogoUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Logo</label>
                <Image
                  src={event.eventLogoUrl}
                  alt="Event Logo"
                  width={150}
                  height={150}
                  className="rounded-lg border"
                />
              </div>
            )}
            {event.welcomePictureUrl && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Welcome Picture</label>
                <Image
                  src={event.welcomePictureUrl}
                  alt="Welcome Picture"
                  width={600}
                  height={400}
                  className="rounded-lg border max-w-full"
                />
              </div>
            )}
          </div>

          {event.welcomeMessage && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Welcome Message</label>
              <p className="text-gray-900 bg-gray-50 p-4 rounded-md">{event.welcomeMessage}</p>
            </div>
          )}

          {event.qrCodeUrl && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">QR Code</label>
              <Image
                src={event.qrCodeUrl}
                alt="Event QR Code"
                width={300}
                height={300}
                className="rounded-lg border"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
