'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { calculateEventBilling, formatINR } from '@/lib/utils/billing-calculator';
import Modal from '@/components/Modal';

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
  const [organizerName, setOrganizerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingEstimate, setBillingEstimate] = useState<any>(null);

  // File upload states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoUploading, setLogoUploading] = useState(false);

  const [welcomeFile, setWelcomeFile] = useState<File | null>(null);
  const [welcomePreview, setWelcomePreview] = useState<string>('');
  const [welcomeUploading, setWelcomeUploading] = useState(false);

  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  } | null>(null);

  // Calculate billing estimate whenever relevant fields change
  useEffect(() => {
    if (formData.estimatedAttendees && formData.maxPhotos && formData.retentionPeriodDays) {
      const estimate = calculateEventBilling({
        estimatedAttendees: formData.estimatedAttendees,
        maxPhotos: formData.maxPhotos,
        retentionPeriodDays: formData.retentionPeriodDays,
        confidenceThreshold: formData.confidenceThreshold,
        photoResizeWidth: formData.photoResizeWidth,
        photoResizeHeight: formData.photoResizeHeight,
      });
      setBillingEstimate(estimate);
    }
  }, [
    formData.estimatedAttendees,
    formData.maxPhotos,
    formData.retentionPeriodDays,
    formData.confidenceThreshold,
  ]);

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
        const organizer = data.organizer;

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

        // Set existing image previews
        if (event.eventLogoUrl) {
          setLogoPreview(event.eventLogoUrl);
        }
        if (event.welcomePictureUrl) {
          setWelcomePreview(event.welcomePictureUrl);
        }

        // Set organizer name for display
        if (organizer) {
          const name = `${organizer.firstName || ''} ${organizer.lastName || ''}`.trim() || organizer.email || event.organizerId;
          setOrganizerName(name);
        } else {
          setOrganizerName(event.organizerId);
        }
      } else {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: 'Failed to fetch event details',
        });
        router.push('/admin/events');
      }
    } catch (error) {
      console.error('Failed to fetch event details:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch event details',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Invalid File Type',
          message: 'Only JPG, JPEG, and PNG files are allowed',
        });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'File Too Large',
          message: 'File size must be less than 5MB',
        });
        return;
      }

      setLogoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWelcomeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Invalid File Type',
          message: 'Only JPG, JPEG, and PNG files are allowed',
        });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'File Too Large',
          message: 'File size must be less than 5MB',
        });
        return;
      }

      setWelcomeFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setWelcomePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadEventAsset = async (file: File, assetType: 'logo' | 'welcome'): Promise<string | null> => {
    try {
      const formDataToUpload = new FormData();
      formDataToUpload.append('file', file);
      formDataToUpload.append('eventId', eventId);
      formDataToUpload.append('assetType', assetType);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/admin/events/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToUpload,
      });

      if (response.ok) {
        const data = await response.json();
        return data.url;
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      throw error;
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

      // Upload logo if new file selected
      let logoUrl = formData.eventLogoUrl;
      if (logoFile) {
        setLogoUploading(true);
        try {
          const uploadedLogoUrl = await uploadEventAsset(logoFile, 'logo');
          if (uploadedLogoUrl) {
            logoUrl = uploadedLogoUrl;
          }
        } catch (uploadError) {
          console.error('Logo upload failed:', uploadError);
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Upload Failed',
            message: 'Failed to upload logo. Please try again.',
          });
          return;
        } finally {
          setLogoUploading(false);
        }
      }

      // Upload welcome picture if new file selected
      let welcomePictureUrl = formData.welcomePictureUrl;
      if (welcomeFile) {
        setWelcomeUploading(true);
        try {
          const uploadedWelcomeUrl = await uploadEventAsset(welcomeFile, 'welcome');
          if (uploadedWelcomeUrl) {
            welcomePictureUrl = uploadedWelcomeUrl;
          }
        } catch (uploadError) {
          console.error('Welcome picture upload failed:', uploadError);
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Upload Failed',
            message: 'Failed to upload welcome picture. Please try again.',
          });
          return;
        } finally {
          setWelcomeUploading(false);
        }
      }

      // Prepare data for submission
      const submitData = {
        ...formData,
        gracePeriodDays: Math.ceil(formData.gracePeriodHours / 24),
        eventLogoUrl: logoUrl,
        welcomePictureUrl: welcomePictureUrl,
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
        setModal({
          isOpen: true,
          type: 'success',
          title: 'Success',
          message: 'Event updated successfully!',
        });
        setTimeout(() => router.push(`/admin/events/${eventId}`), 1500);
      } else {
        const error = await response.json();
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Update Failed',
          message: error.error || 'Failed to update event',
        });
      }
    } catch (error) {
      console.error('Failed to update event:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to update event',
      });
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
      {/* Modal */}
      {modal?.isOpen && (
        <Modal
          isOpen={modal.isOpen}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          onClose={() => setModal(null)}
        />
      )}

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
                  value={organizerName}
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['Event Name', 'Event Logo', 'Date', 'Photographer Name', 'FaceFind Branding'].map((element) => (
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
                  Event Logo
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleLogoFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                {logoPreview && (
                  <div className="mt-2">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-20 rounded border border-gray-300"
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Accepted formats: JPG, JPEG, PNG (Max 5MB). Upload new file to replace existing.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Welcome Picture
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleWelcomeFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                {welcomePreview && (
                  <div className="mt-2">
                    <img
                      src={welcomePreview}
                      alt="Welcome picture preview"
                      className="h-40 rounded border border-gray-300"
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Accepted formats: JPG, JPEG, PNG (Max 5MB). Upload new file to replace existing.
                </p>
              </div>

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

          {/* Billing Estimate */}
          {billingEstimate && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">💰</span> Updated Billing Estimate
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Summary */}
                <div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600 mb-2">Total Estimated Cost</div>
                    <div className="text-3xl font-bold text-blue-600 mb-4">
                      {formatINR(billingEstimate.estimatedPrice)}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">AWS Services Cost:</span>
                        <span className="font-medium text-gray-900">{formatINR(billingEstimate.totalAWSCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Profit Margin (40%):</span>
                        <span className="font-medium text-green-600">+{formatINR(billingEstimate.profitMargin)}</span>
                      </div>
                      <div className="border-t pt-2 mt-2"></div>
                      <div className="flex justify-between text-base font-semibold">
                        <span>Charge to Organizer:</span>
                        <span className="text-blue-600">{formatINR(billingEstimate.estimatedPrice)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm font-medium text-gray-700 mb-2">Event Specs</div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>Attendees: <span className="font-medium text-gray-900">{billingEstimate.configurations.estimatedAttendees}</span></div>
                      <div>Max Photos: <span className="font-medium text-gray-900">{billingEstimate.configurations.maxPhotos}</span></div>
                      <div>Retention: <span className="font-medium text-gray-900">{billingEstimate.configurations.retentionPeriodDays} days</span></div>
                      <div>Storage: <span className="font-medium text-gray-900">{billingEstimate.configurations.totalStorageGB} GB</span></div>
                    </div>
                  </div>

                  {billingEstimate.configurations.retentionMultiplier > 1.0 && (
                    <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-orange-600 text-sm">⚠️</span>
                        <div className="text-xs text-orange-800">
                          <div className="font-medium">Retention Period Surcharge Applied</div>
                          <div className="mt-1">
                            {billingEstimate.configurations.retentionPeriodDays} days retention =
                            <span className="font-semibold"> {billingEstimate.configurations.retentionMultiplier}x</span> multiplier
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Breakdown */}
                <div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm font-medium text-gray-700 mb-3">AWS Cost Breakdown</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Storage (S3):</span>
                        <span className="font-semibold text-gray-900">{formatINR(billingEstimate.breakdown.storage)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Processing (Lambda):</span>
                        <span className="font-semibold text-gray-900">{formatINR(billingEstimate.breakdown.lambda)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Face Recognition:</span>
                        <span className="font-semibold text-gray-900">{formatINR(billingEstimate.breakdown.rekognition)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Database:</span>
                        <span className="font-semibold text-gray-900">{formatINR(billingEstimate.breakdown.dynamodb)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Data Transfer:</span>
                        <span className="font-semibold text-gray-900">{formatINR(billingEstimate.breakdown.cloudfront)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Email (SES):</span>
                        <span className="font-semibold text-gray-900">{formatINR(billingEstimate.breakdown.email)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Other Services:</span>
                        <span className="font-semibold text-gray-900">{formatINR(billingEstimate.breakdown.other)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex gap-2">
                      <span className="text-yellow-600 text-lg">ℹ️</span>
                      <div className="text-xs text-yellow-800">
                        <div className="font-medium mb-1">Estimate Notes:</div>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Actual costs may vary based on usage</li>
                          <li>Includes 40% profit margin</li>
                          <li>Based on Mumbai (ap-south-1) pricing</li>
                          <li>Auto-calculated from event configuration</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving || logoUploading || welcomeUploading}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving...' : logoUploading ? 'Uploading Logo...' : welcomeUploading ? 'Uploading Welcome Picture...' : 'Save Changes'}
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
