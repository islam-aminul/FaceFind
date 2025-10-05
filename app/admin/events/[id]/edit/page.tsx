'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface FormData {
  eventName: string;
  organizerId: string;
  startDateTime: string;
  endDateTime: string;
  location: string;
  estimatedAttendees: number;
  maxPhotos: number;
  gracePeriodHours: number;
  retentionPeriodDays: number;
  confidenceThreshold: number;
  photoResizeWidth: number;
  photoResizeHeight: number;
  photoQuality: number;
  watermarkElements: string[];
  eventLogoUrl: string;
  welcomeMessage: string;
  welcomePictureUrl: string;
}

export default function EventEditPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [formData, setFormData] = useState<FormData>({
    eventName: '',
    organizerId: '',
    startDateTime: '',
    endDateTime: '',
    location: '',
    estimatedAttendees: 100,
    maxPhotos: 500,
    gracePeriodHours: 3,
    retentionPeriodDays: 7,
    confidenceThreshold: 85,
    photoResizeWidth: 2560,
    photoResizeHeight: 1440,
    photoQuality: 85,
    watermarkElements: [],
    eventLogoUrl: '',
    welcomeMessage: '',
    welcomePictureUrl: '',
  });

  const [originalOrganizerId, setOriginalOrganizerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

    fetchEventDetails(token);
  }, [eventId, router]);

  const fetchEventDetails = async (token: string) => {
    try {
      const response = await fetch(`/api/v1/admin/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const event = data.event;

        // Convert gracePeriodDays to hours for the form
        const gracePeriodHours = event.gracePeriodDays * 24;

        setFormData({
          eventName: event.eventName,
          organizerId: event.organizerId,
          startDateTime: event.startDateTime.slice(0, 16), // Format for datetime-local
          endDateTime: event.endDateTime.slice(0, 16),
          location: event.location,
          estimatedAttendees: event.estimatedAttendees,
          maxPhotos: event.maxPhotos,
          gracePeriodHours,
          retentionPeriodDays: event.retentionPeriodDays,
          confidenceThreshold: event.confidenceThreshold,
          photoResizeWidth: event.photoResizeWidth,
          photoResizeHeight: event.photoResizeHeight,
          photoQuality: event.photoQuality,
          watermarkElements: event.watermarkElements || [],
          eventLogoUrl: event.eventLogoUrl || '',
          welcomeMessage: event.welcomeMessage || '',
          welcomePictureUrl: event.welcomePictureUrl || '',
        });
        setOriginalOrganizerId(event.organizerId);
      } else {
        alert('Failed to fetch event details');
        router.push('/admin/events');
      }
    } catch (error) {
      console.error('Failed to fetch event details:', error);
      alert('Failed to fetch event details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleWatermarkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      watermarkElements: checked
        ? [...prev.watermarkElements, value]
        : prev.watermarkElements.filter(item => item !== value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');

      // Prepare data for submission
      const submitData = {
        ...formData,
        gracePeriodDays: Math.ceil(formData.gracePeriodHours / 24),
      };

      const response = await fetch(`/api/v1/admin/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        alert('Event updated successfully!');
        router.push(`/admin/events/${eventId}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update event');
      }
    } catch (error) {
      console.error('Failed to update event:', error);
      alert('Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading event...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href={`/admin/events/${eventId}`} className="text-blue-600 hover:text-blue-800 text-sm mb-1 block">
            ← Back to Event Details
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
          <p className="text-sm text-gray-600 mt-1">
            Update event configuration and settings
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-8">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Name *
                </label>
                <input
                  type="text"
                  name="eventName"
                  required
                  value={formData.eventName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organizer
                </label>
                <input
                  type="text"
                  value={originalOrganizerId}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Organizer cannot be changed after event creation</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  name="startDateTime"
                  required
                  value={formData.startDateTime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date & Time *
                </label>
                <input
                  type="datetime-local"
                  name="endDateTime"
                  required
                  value={formData.endDateTime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Event Configuration */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Attendees *
                </label>
                <input
                  type="number"
                  name="estimatedAttendees"
                  required
                  min="1"
                  value={formData.estimatedAttendees}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Photos *
                </label>
                <input
                  type="number"
                  name="maxPhotos"
                  required
                  min="1"
                  value={formData.maxPhotos}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confidence Threshold (%) *
                </label>
                <input
                  type="number"
                  name="confidenceThreshold"
                  required
                  min="50"
                  max="100"
                  value={formData.confidenceThreshold}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grace Period (hours) *
                </label>
                <input
                  type="number"
                  name="gracePeriodHours"
                  required
                  min="1"
                  value={formData.gracePeriodHours}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Time after event for attendee access</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retention Period (days) *
                </label>
                <input
                  type="number"
                  name="retentionPeriodDays"
                  required
                  min="1"
                  value={formData.retentionPeriodDays}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">How long to keep photos</p>
              </div>
            </div>
          </div>

          {/* Photo Settings */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Photo Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resize Width (px)
                </label>
                <input
                  type="number"
                  name="photoResizeWidth"
                  value={formData.photoResizeWidth}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resize Height (px)
                </label>
                <input
                  type="number"
                  name="photoResizeHeight"
                  value={formData.photoResizeHeight}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality (%)
                </label>
                <input
                  type="number"
                  name="photoQuality"
                  min="1"
                  max="100"
                  value={formData.photoQuality}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Watermark Elements
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['Event Name', 'Date', 'Logo', 'Photographer Name'].map((element) => (
                    <label key={element} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value={element}
                        checked={formData.watermarkElements.includes(element)}
                        onChange={handleWatermarkChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{element}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Customization */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Customization</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Welcome Message
                </label>
                <textarea
                  name="welcomeMessage"
                  rows={3}
                  value={formData.welcomeMessage}
                  onChange={handleChange}
                  placeholder="Welcome to our event! Scan your face to find your photos..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Logo URL
                </label>
                <input
                  type="url"
                  name="eventLogoUrl"
                  value={formData.eventLogoUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Welcome Picture URL
                </label>
                <input
                  type="url"
                  name="welcomePictureUrl"
                  value={formData.welcomePictureUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/welcome.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Warning Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex gap-2">
              <span className="text-yellow-600 text-lg">⚠️</span>
              <div className="text-sm text-yellow-800">
                <div className="font-medium mb-1">Important Notes:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Changing attendees, photos, or retention period will affect billing</li>
                  <li>Photo settings changes only apply to new uploads</li>
                  <li>Organizer cannot be changed after event creation</li>
                  <li>Payment amount is auto-calculated and cannot be manually edited</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={`/admin/events/${eventId}`}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition font-semibold"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
