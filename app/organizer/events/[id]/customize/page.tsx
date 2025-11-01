'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Event {
  id: string;
  eventName: string;
  eventLogoUrl?: string;
  welcomeMessage?: string;
  welcomePictureUrl?: string;
}

export default function OrganizerCustomizePage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    welcomeMessage: '',
    eventLogoUrl: '',
    welcomePictureUrl: '',
  });

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
        setFormData({
          welcomeMessage: data.event.welcomeMessage || '',
          eventLogoUrl: data.event.eventLogoUrl || '',
          welcomePictureUrl: data.event.welcomePictureUrl || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/v1/organizer/events/${eventId}/landing-page`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setEvent(data.event);
        setMessage('Landing page updated successfully!');
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to update landing page');
      }
    } catch (error: any) {
      setMessage(error.message || 'Failed to update landing page');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href={`/organizer/events/${eventId}`} className="text-blue-600 hover:text-blue-800 text-sm mb-2 block">
            ← Back to Event Details
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Customize Landing Page</h1>
          <p className="text-gray-600 mt-1">{event?.eventName}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-md ${message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Edit Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Edit Landing Page</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Welcome Message
                </label>
                <textarea
                  value={formData.welcomeMessage}
                  onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter a welcome message for attendees..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Logo URL
                </label>
                <input
                  type="url"
                  value={formData.eventLogoUrl}
                  onChange={(e) => setFormData({ ...formData, eventLogoUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-gray-500 mt-1">Enter the URL of your event logo</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Welcome Picture URL
                </label>
                <input
                  type="url"
                  value={formData.welcomePictureUrl}
                  onChange={(e) => setFormData({ ...formData, welcomePictureUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/welcome.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">Enter the URL of your welcome picture</p>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <Link
                  href={`/event/${eventId}`}
                  target="_blank"
                  className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition text-center"
                >
                  Preview
                </Link>
              </div>
            </form>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Preview</h2>

            <div className="space-y-6">
              {formData.eventLogoUrl && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Event Logo:</p>
                  <Image
                    src={formData.eventLogoUrl}
                    alt="Event Logo"
                    width={150}
                    height={150}
                    className="rounded-lg border"
                  />
                </div>
              )}

              {formData.welcomeMessage && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Welcome Message:</p>
                  <p className="text-gray-900 bg-gray-50 p-4 rounded-md">{formData.welcomeMessage}</p>
                </div>
              )}

              {formData.welcomePictureUrl && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Welcome Picture:</p>
                  <Image
                    src={formData.welcomePictureUrl}
                    alt="Welcome Picture"
                    width={600}
                    height={400}
                    className="rounded-lg border w-full"
                  />
                </div>
              )}

              {!formData.eventLogoUrl && !formData.welcomeMessage && !formData.welcomePictureUrl && (
                <p className="text-gray-500 text-center py-8">No content to preview</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
