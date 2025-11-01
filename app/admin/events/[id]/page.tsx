'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

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
  const [qrCodePresignedUrl, setQrCodePresignedUrl] = useState<string | null>(null);

  // Photographer assignment states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availablePhotographers, setAvailablePhotographers] = useState<User[]>([]);
  const [selectedPhotographer, setSelectedPhotographer] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
  } | null>(null);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

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

  const fetchQRCodeUrl = async (token: string) => {
    try {
      const response = await fetch(`/api/v1/admin/events/${eventId}/qr-download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQrCodePresignedUrl(data.url);
      } else if (response.status === 400) {
        // Old format detected, show message
        const error = await response.json();
        setToast({
          type: 'info',
          title: 'Action Required',
          message: error.error || 'Please regenerate the QR code',
        });
      }
    } catch (error) {
      console.error('Failed to fetch QR code URL:', error);
    }
  };

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

        // Fetch presigned URL for QR code if it exists
        if (data.event.qrCodeUrl) {
          fetchQRCodeUrl(token);
        }
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
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Mark as Paid',
      message: 'Are you sure you want to mark this event as paid?',
      onConfirm: async () => {
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
            setToast({
              type: 'success',
              title: 'Success',
              message: 'Event marked as paid successfully!',
            });
            fetchEventDetails(token!);
          } else {
            const error = await response.json();
            setToast({
              type: 'error',
              title: 'Error',
              message: error.error || 'Failed to mark event as paid',
            });
          }
        } catch (error) {
          console.error('Failed to mark as paid:', error);
          setToast({
            type: 'error',
            title: 'Error',
            message: 'Failed to mark event as paid',
          });
        } finally {
          setMarking(false);
        }
      },
    });
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
        setToast({
          type: 'success',
          title: 'Success',
          message: 'QR code generated successfully!',
        });
        fetchEventDetails(token!);
      } else {
        const error = await response.json();
        setToast({
          type: 'error',
          title: 'Error',
          message: error.error || 'Failed to generate QR code',
        });
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      setToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to generate QR code',
      });
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleDownloadQR = async () => {
    if (!qrCodePresignedUrl) {
      const token = localStorage.getItem('token');
      await fetchQRCodeUrl(token!);
      return;
    }

    try {
      // Fetch the image
      const response = await fetch(qrCodePresignedUrl);
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event?.eventName || 'event'}-qr-code.png`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      setToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to download QR code',
      });
    }
  };

  const fetchAvailablePhotographers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/admin/users/list?role=PHOTOGRAPHER', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter out already assigned photographers
        const assignedIds = photographers.map(p => p.id);
        const available = (data.users || []).filter((p: User) => !assignedIds.includes(p.id));
        setAvailablePhotographers(available);
      }
    } catch (error) {
      console.error('Failed to fetch photographers:', error);
    }
  };

  const handleOpenAssignModal = async () => {
    await fetchAvailablePhotographers();
    setShowAssignModal(true);
  };

  const handleAssignPhotographer = async () => {
    if (!selectedPhotographer) {
      setToast({
        type: 'error',
        title: 'Error',
        message: 'Please select a photographer',
      });
      return;
    }

    setAssigning(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/admin/events/${eventId}/assign-photographer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photographerId: selectedPhotographer,
        }),
      });

      if (response.ok) {
        setToast({
          type: 'success',
          title: 'Success',
          message: 'Photographer assigned successfully!',
        });
        setShowAssignModal(false);
        setSelectedPhotographer('');
        fetchEventDetails(token!);
      } else {
        const error = await response.json();
        setToast({
          type: 'error',
          title: 'Error',
          message: error.error || 'Failed to assign photographer',
        });
      }
    } catch (error) {
      console.error('Failed to assign photographer:', error);
      setToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to assign photographer',
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemovePhotographer = async (photographerId: string, photographerName: string) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Remove Photographer',
      message: `Are you sure you want to remove ${photographerName} from this event?`,
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(
            `/api/v1/admin/events/${eventId}/assign-photographer?photographerId=${photographerId}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            setToast({
              type: 'success',
              title: 'Success',
              message: 'Photographer removed successfully!',
            });
            fetchEventDetails(token!);
          } else {
            const error = await response.json();
            setToast({
              type: 'error',
              title: 'Error',
              message: error.error || 'Failed to remove photographer',
            });
          }
        } catch (error) {
          console.error('Failed to remove photographer:', error);
          setToast({
            type: 'error',
            title: 'Error',
            message: 'Failed to remove photographer',
          });
        }
      },
    });
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
      {/* Modal */}
      {modal?.isOpen && (
        <Modal
          isOpen={modal.isOpen}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          onClose={() => setModal(null)}
          onConfirm={modal.onConfirm}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Assign Photographer Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => {
              setShowAssignModal(false);
              setSelectedPhotographer('');
            }}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-start gap-4 p-6 border-b-2 border-blue-200 bg-blue-50">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg bg-blue-100 text-blue-800">
                +
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-blue-800">Assign Photographer</h3>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedPhotographer('');
                }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Photographer
              </label>
              <select
                value={selectedPhotographer}
                onChange={(e) => setSelectedPhotographer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                disabled={assigning}
              >
                <option value="">Select a photographer</option>
                {availablePhotographers.map((photographer) => (
                  <option key={photographer.id} value={photographer.id}>
                    {photographer.firstName} {photographer.lastName} ({photographer.email})
                  </option>
                ))}
              </select>
              {availablePhotographers.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  No photographers available to assign
                </p>
              )}
            </div>
            <div className="flex gap-3 p-6 pt-0 justify-end">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedPhotographer('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignPhotographer}
                disabled={assigning || !selectedPhotographer}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-semibold disabled:opacity-50"
              >
                {assigning ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/admin/events" className="text-blue-600 hover:text-blue-800 text-sm mb-1 block">
            ← Back to Events
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{event.eventName}</h1>
              <div className="flex gap-2 items-center mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(event.status)}`}>
                  {event.status}
                </span>
                {event.paymentStatus === 'PENDING' && (
                  <span className="text-xs text-orange-600 font-medium">💳 Payment Pending</span>
                )}
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Assigned Photographers</h2>
                <button
                  onClick={handleOpenAssignModal}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
                >
                  + Assign
                </button>
              </div>
              {photographers.length > 0 ? (
                <div className="space-y-3">
                  {photographers.map((photographer) => (
                    <div key={photographer.id} className="flex justify-between items-start pb-3 border-b last:border-b-0 last:pb-0">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {photographer.firstName} {photographer.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{photographer.email}</div>
                      </div>
                      <button
                        onClick={() => handleRemovePhotographer(
                          photographer.id,
                          `${photographer.firstName} ${photographer.lastName}`
                        )}
                        className="text-red-600 hover:text-red-800 text-sm font-medium ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">No photographers assigned yet</p>
                </div>
              )}
            </div>

            {/* QR Code */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">QR Code</h2>
              {event.qrCodeUrl ? (
                <div className="text-center">
                  {qrCodePresignedUrl ? (
                    <>
                      <img src={qrCodePresignedUrl} alt="QR Code" className="mx-auto mb-3 max-w-xs" />
                      <button
                        onClick={handleDownloadQR}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                      >
                        Download QR Code
                      </button>
                    </>
                  ) : (
                    <div className="py-4">
                      <p className="text-gray-500 text-sm mb-3">QR Code exists but needs to be regenerated</p>
                      <button
                        onClick={handleGenerateQR}
                        disabled={generatingQR}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                      >
                        {generatingQR ? 'Regenerating...' : 'Regenerate QR Code'}
                      </button>
                    </div>
                  )}
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
