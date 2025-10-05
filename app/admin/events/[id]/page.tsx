'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

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
  photoResizeWidth: number;
  photoResizeHeight: number;
  photoQuality: number;
  watermarkElements: string[];
  eventLogoUrl?: string;
  welcomeMessage?: string;
  welcomePictureUrl?: string;
  qrCodeUrl?: string;
  paymentStatus: string;
  paymentAmount: number;
  status: string;
  rekognitionCollectionId: string;
  createdAt: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
}

export default function EventDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [organizer, setOrganizer] = useState<User | null>(null);
  const [photographers, setPhotographers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);

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
        setEvent(data.event);
        setOrganizer(data.organizer);
        setPhotographers(data.photographers || []);
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

  const handleMarkAsPaid = async () => {
    if (!confirm('Are you sure you want to mark this event as paid?')) {
      return;
    }

    setMarking(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/admin/events/${eventId}/mark-paid`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentDate: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        alert('Event marked as paid successfully!');
        fetchEventDetails(token!);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to mark event as paid');
      }
    } catch (error) {
      console.error('Failed to mark as paid:', error);
      alert('Failed to mark event as paid');
    } finally {
      setMarking(false);
    }
  };

  const handleGenerateQR = async () => {
    setGeneratingQR(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/admin/events/${eventId}/generate-qr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        alert('QR code generated successfully!');
        fetchEventDetails(token!);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to generate QR code');
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      alert('Failed to generate QR code');
    } finally {
      setGeneratingQR(false);
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

  const getPaymentBadge = (status: string) => {
    return status === 'PAID'
      ? 'bg-green-100 text-green-800'
      : 'bg-orange-100 text-orange-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading event details...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Event not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/admin/events" className="text-blue-600 hover:text-blue-800 text-sm mb-1 block">
            ← Back to Events
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{event.eventName}</h1>
              <div className="flex gap-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPaymentBadge(event.paymentStatus)}`}>
                  {event.paymentStatus}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(event.status)}`}>
                  {event.status}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {event.paymentStatus === 'PENDING' && (
                <button
                  onClick={handleMarkAsPaid}
                  disabled={marking}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50"
                >
                  {marking ? 'Marking...' : 'Mark as Paid'}
                </button>
              )}
              <Link
                href={`/admin/events/${eventId}/edit`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                Edit Event
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Start Date & Time</label>
                  <p className="text-gray-900 font-medium">
                    {new Date(event.startDateTime).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">End Date & Time</label>
                  <p className="text-gray-900 font-medium">
                    {new Date(event.endDateTime).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Location</label>
                  <p className="text-gray-900 font-medium">{event.location}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Estimated Attendees</label>
                  <p className="text-gray-900 font-medium">{event.estimatedAttendees}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Max Photos</label>
                  <p className="text-gray-900 font-medium">{event.maxPhotos}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Grace Period</label>
                  <p className="text-gray-900 font-medium">{event.gracePeriodDays} days</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Retention Period</label>
                  <p className="text-gray-900 font-medium">{event.retentionPeriodDays} days</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Confidence Threshold</label>
                  <p className="text-gray-900 font-medium">{event.confidenceThreshold}%</p>
                </div>
              </div>
            </div>

            {/* Photo Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Photo Settings</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Resize Dimensions</label>
                  <p className="text-gray-900 font-medium">
                    {event.photoResizeWidth} × {event.photoResizeHeight}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Quality</label>
                  <p className="text-gray-900 font-medium">{event.photoQuality}%</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-gray-500">Watermark Elements</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {event.watermarkElements && event.watermarkElements.length > 0 ? (
                      event.watermarkElements.map((element, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {element}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">None</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Customization */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Customization</h2>
              <div className="space-y-4">
                {event.eventLogoUrl && (
                  <div>
                    <label className="text-sm text-gray-500">Event Logo</label>
                    <img src={event.eventLogoUrl} alt="Event Logo" className="mt-2 h-20 rounded" />
                  </div>
                )}
                {event.welcomeMessage && (
                  <div>
                    <label className="text-sm text-gray-500">Welcome Message</label>
                    <p className="text-gray-900 mt-1">{event.welcomeMessage}</p>
                  </div>
                )}
                {event.welcomePictureUrl && (
                  <div>
                    <label className="text-sm text-gray-500">Welcome Picture</label>
                    <img src={event.welcomePictureUrl} alt="Welcome" className="mt-2 h-40 rounded" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Billing */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing</h2>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                ₹{event.paymentAmount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Payment Amount</div>
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-gray-500">Created</div>
                <div className="text-gray-900 font-medium">
                  {new Date(event.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Organizer */}
            {organizer && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Organizer</h2>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-gray-500">Name</div>
                    <div className="text-gray-900 font-medium">
                      {organizer.firstName} {organizer.lastName}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Email</div>
                    <div className="text-gray-900">{organizer.email}</div>
                  </div>
                  {organizer.phone && (
                    <div>
                      <div className="text-sm text-gray-500">Phone</div>
                      <div className="text-gray-900">{organizer.phone}</div>
                    </div>
                  )}
                  {organizer.companyName && (
                    <div>
                      <div className="text-sm text-gray-500">Company</div>
                      <div className="text-gray-900">{organizer.companyName}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Photographers */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Assigned Photographers</h2>
              {photographers.length > 0 ? (
                <div className="space-y-3">
                  {photographers.map((photographer) => (
                    <div key={photographer.id} className="pb-3 border-b last:border-b-0 last:pb-0">
                      <div className="font-medium text-gray-900">
                        {photographer.firstName} {photographer.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{photographer.email}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm mb-3">No photographers assigned</p>
                  <Link
                    href={`/admin/events/${eventId}/assign-photographer`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Assign Photographer
                  </Link>
                </div>
              )}
            </div>

            {/* QR Code */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">QR Code</h2>
              {event.qrCodeUrl ? (
                <div className="text-center">
                  <img src={event.qrCodeUrl} alt="QR Code" className="mx-auto mb-3" />
                  <a
                    href={event.qrCodeUrl}
                    download
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Download QR Code
                  </a>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm mb-3">QR Code not generated yet</p>
                  <button
                    onClick={handleGenerateQR}
                    disabled={generatingQR}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                  >
                    {generatingQR ? 'Generating...' : 'Generate QR Code'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
