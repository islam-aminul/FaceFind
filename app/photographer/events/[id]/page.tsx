'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Event {
  id: string;
  eventName: string;
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
  status: string;
}

export default function PhotographerEventDetailsPage() {
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
    if (user.role !== 'PHOTOGRAPHER') {
      router.push('/login');
      return;
    }

    setUserId(user.id);
    fetchEvent(token, user.id);
  }, [router, eventId]);

  const fetchEvent = async (token: string, userId: string) => {
    try {
      const response = await fetch(`/api/v1/photographer/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvent(data.event);
      } else {
        router.push('/photographer/events');
      }
    } catch (error) {
      console.error('Failed to fetch event:', error);
      router.push('/photographer/events');
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
          <Link href="/photographer/events" className="text-blue-600 hover:text-blue-800 text-sm mb-2 block">
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
              href={`/photographer/events/${eventId}/upload`}
              className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
            >
              📤 Upload Photos
            </Link>
            <Link
              href={`/photographer/events/${eventId}/photos`}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
            >
              📸 View All Photos
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
          </div>
        </div>

        {/* Upload Guidelines */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Photo Upload Guidelines</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Photo Requirements:</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Supported formats: JPEG, PNG, RAW</li>
                <li>Maximum file size: 50MB per photo</li>
                <li>Maximum total photos: {event.maxPhotos}</li>
                {event.photoResizeWidth && event.photoResizeHeight && (
                  <li>Photos will be resized to: {event.photoResizeWidth}x{event.photoResizeHeight}px</li>
                )}
                {event.photoQuality && (
                  <li>JPEG quality: {event.photoQuality}%</li>
                )}
              </ul>
            </div>

            {event.watermarkElements && event.watermarkElements.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Watermark Elements:</h3>
                <div className="flex gap-2 flex-wrap">
                  {event.watermarkElements.map((element, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {element}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Processing:</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Photos are automatically processed for face detection</li>
                <li>Attendees can find their photos through face scanning</li>
                <li>Confidence threshold: {event.confidenceThreshold}%</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
