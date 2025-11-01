'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatINR } from '@/lib/utils/billing-calculator';
import Modal from '@/components/Modal';

type ModalState = {
  isOpen: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
} | null;

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [organizerSearch, setOrganizerSearch] = useState('');
  const [billingEstimate, setBillingEstimate] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [formData, setFormData] = useState({
    eventName: '',
    organizerId: '',
    startDateTime: '',
    endDateTime: '',
    location: '',
    estimatedAttendees: 100,
    maxPhotos: 1000,
    gracePeriodHours: 3,
    retentionPeriodDays: 7,
    confidenceThreshold: 85,
    photoResizeWidth: 2560,
    photoResizeHeight: 1440,
    photoQuality: 85,
    watermarkElements: [] as string[],
    eventLogoUrl: '',
    welcomeMessage: '',
    welcomePictureUrl: '',
  });

  // File upload states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoUploading, setLogoUploading] = useState(false);

  const [welcomeFile, setWelcomeFile] = useState<File | null>(null);
  const [welcomePreview, setWelcomePreview] = useState<string>('');
  const [welcomeUploading, setWelcomeUploading] = useState(false);

  // Separate state for date/time inputs
  const [startDate, setStartDate] = useState('');
  const [startHour, setStartHour] = useState('');
  const [startMinute, setStartMinute] = useState('00');
  const [startPeriod, setStartPeriod] = useState('AM');

  const [endDate, setEndDate] = useState('');
  const [endHour, setEndHour] = useState('');
  const [endMinute, setEndMinute] = useState('00');
  const [endPeriod, setEndPeriod] = useState('AM');

  // Update formData when date/time inputs change
  useEffect(() => {
    if (startDate && startHour && startMinute) {
      const hour24 = startPeriod === 'PM' && startHour !== '12'
        ? parseInt(startHour) + 12
        : startPeriod === 'AM' && startHour === '12'
        ? 0
        : parseInt(startHour);

      const dateTimeString = `${startDate}T${String(hour24).padStart(2, '0')}:${startMinute}:00`;
      setFormData(prev => ({ ...prev, startDateTime: dateTimeString }));
    }
  }, [startDate, startHour, startMinute, startPeriod]);

  useEffect(() => {
    if (endDate && endHour && endMinute) {
      const hour24 = endPeriod === 'PM' && endHour !== '12'
        ? parseInt(endHour) + 12
        : endPeriod === 'AM' && endHour === '12'
        ? 0
        : parseInt(endHour);

      const dateTimeString = `${endDate}T${String(hour24).padStart(2, '0')}:${endMinute}:00`;
      setFormData(prev => ({ ...prev, endDateTime: dateTimeString }));
    }
  }, [endDate, endHour, endMinute, endPeriod]);

  // Fetch settings on mount
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

    // Fetch settings and organizers
    Promise.all([
      fetchSettings(),
      fetchOrganizers(token),
    ]).finally(() => {
      setSettingsLoading(false);
    });
  }, [router]);

  // Apply settings to form data once loaded
  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        estimatedAttendees: settings.estimatedAttendees,
        maxPhotos: settings.maxPhotos,
        gracePeriodHours: settings.gracePeriodHours,
        retentionPeriodDays: settings.retentionPeriodDays,
        confidenceThreshold: settings.confidenceThreshold,
        photoResizeWidth: settings.photoResizeWidth,
        photoResizeHeight: settings.photoResizeHeight,
        photoQuality: settings.photoQuality,
      }));
    }
  }, [settings]);

  // Calculate billing estimate whenever relevant fields change
  useEffect(() => {
    if (formData.estimatedAttendees && formData.maxPhotos && formData.retentionPeriodDays) {
      // Call server-side API for billing calculation
      fetch('/api/v1/billing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estimatedAttendees: formData.estimatedAttendees,
          maxPhotos: formData.maxPhotos,
          retentionPeriodDays: formData.retentionPeriodDays,
          confidenceThreshold: formData.confidenceThreshold,
          photoResizeWidth: formData.photoResizeWidth,
          photoResizeHeight: formData.photoResizeHeight,
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setBillingEstimate(data.estimate);
          }
        })
        .catch(error => {
          console.error('Failed to calculate billing:', error);
        });
    }
  }, [
    formData.estimatedAttendees,
    formData.maxPhotos,
    formData.retentionPeriodDays,
    formData.confidenceThreshold,
  ]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/v1/settings/defaults');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.defaults);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const fetchOrganizers = async (token: string) => {
    try {
      const response = await fetch('/api/v1/admin/users/list?role=ORGANIZER', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch organizers:', error);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = settings?.allowedFileTypes || ['image/jpeg', 'image/jpg', 'image/png'];
      const maxSizeMB = settings?.maxUploadSizeMB || 10;

      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Invalid File Type',
          message: `Only ${allowedTypes.join(', ')} files are allowed`,
        });
        return;
      }

      // Validate file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'File Too Large',
          message: `File size must be less than ${maxSizeMB}MB`,
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
      const allowedTypes = settings?.allowedFileTypes || ['image/jpeg', 'image/jpg', 'image/png'];
      const maxSizeMB = settings?.maxUploadSizeMB || 10;

      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Invalid File Type',
          message: `Only ${allowedTypes.join(', ')} files are allowed`,
        });
        return;
      }

      // Validate file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        setModal({
          isOpen: true,
          type: 'error',
          title: 'File Too Large',
          message: `File size must be less than ${maxSizeMB}MB`,
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

  const uploadEventAsset = async (file: File, eventId: string, assetType: 'logo' | 'welcome'): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('eventId', eventId);
      formData.append('assetType', assetType);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/admin/events/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Ensure datetime fields are properly set
      const startHour24 = startPeriod === 'PM' && startHour !== '12'
        ? parseInt(startHour) + 12
        : startPeriod === 'AM' && startHour === '12'
        ? 0
        : parseInt(startHour);

      const endHour24 = endPeriod === 'PM' && endHour !== '12'
        ? parseInt(endHour) + 12
        : endPeriod === 'AM' && endHour === '12'
        ? 0
        : parseInt(endHour);

      // Format as ISO 8601 with timezone (Z for UTC)
      const startDateTime = `${startDate}T${String(startHour24).padStart(2, '0')}:${startMinute}:00.000Z`;
      const endDateTime = `${endDate}T${String(endHour24).padStart(2, '0')}:${endMinute}:00.000Z`;

      const payload = {
        ...formData,
        startDateTime,
        endDateTime,
        paymentAmount: billingEstimate?.estimatedPrice || settings?.fallbackPaymentAmount || 15000,
      };

      console.log('Submitting event:', payload);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/admin/events/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        const eventId = data.event.id;

        // Upload logo if selected
        if (logoFile) {
          setLogoUploading(true);
          try {
            const logoUrl = await uploadEventAsset(logoFile, eventId, 'logo');
            if (logoUrl) {
              // Update event with logo URL
              await fetch(`/api/v1/admin/events/${eventId}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ eventLogoUrl: logoUrl }),
              });
            }
          } catch (uploadError) {
            console.error('Logo upload failed:', uploadError);
          } finally {
            setLogoUploading(false);
          }
        }

        // Upload welcome picture if selected
        if (welcomeFile) {
          setWelcomeUploading(true);
          try {
            const welcomeUrl = await uploadEventAsset(welcomeFile, eventId, 'welcome');
            if (welcomeUrl) {
              // Update event with welcome picture URL
              await fetch(`/api/v1/admin/events/${eventId}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ welcomePictureUrl: welcomeUrl }),
              });
            }
          } catch (uploadError) {
            console.error('Welcome picture upload failed:', uploadError);
          } finally {
            setWelcomeUploading(false);
          }
        }

        setModal({
          isOpen: true,
          type: 'success',
          title: 'Event Created Successfully!',
          message: 'The event has been created and organizer has been notified.',
        });
        setTimeout(() => router.push('/admin/events'), 2000);
      } else {
        const error = await response.json();
        console.error('Event creation error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Failed to Create Event',
          message: error.error + (error.details ? `: ${JSON.stringify(error.details[0])}` : '') || 'An error occurred while creating the event',
        });
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Failed to Create Event',
        message: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: any) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value,
    }));
  };

  const watermarkOptions = [
    'Event Name',
    'Event Logo',
    'Date',
    'Photographer Name',
    'FaceFind Branding',
  ];

  const toggleWatermark = (option: string) => {
    setFormData(prev => ({
      ...prev,
      watermarkElements: prev.watermarkElements.includes(option)
        ? prev.watermarkElements.filter(w => w !== option)
        : [...prev.watermarkElements, option],
    }));
  };

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
          <Link href="/admin/events" className="text-blue-600 hover:text-blue-800 text-sm mb-1 block">
            ← Back to Events
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create New Event</h1>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
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
                  placeholder="e.g., Rajesh & Priya Wedding"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organizer *
                </label>
                <input
                  type="text"
                  placeholder="Search organizer by name or email..."
                  value={organizerSearch}
                  onChange={(e) => setOrganizerSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 mb-2"
                />
                <select
                  name="organizerId"
                  required
                  value={formData.organizerId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  size={5}
                >
                  <option value="">Select Organizer</option>
                  {organizers
                    .filter((org) => {
                      const searchLower = organizerSearch.toLowerCase();
                      return (
                        org.firstName?.toLowerCase().includes(searchLower) ||
                        org.lastName?.toLowerCase().includes(searchLower) ||
                        org.email?.toLowerCase().includes(searchLower)
                      );
                    })
                    .map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.firstName} {org.lastName} ({org.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date & Time *
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="dd/mm/yyyy"
                  />
                  <div className="grid grid-cols-4 gap-2">
                    <select
                      required
                      value={startHour}
                      onChange={(e) => setStartHour(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="">HH</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                        <option key={h} value={String(h).padStart(2, '0')}>
                          {String(h).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <select
                      required
                      value={startMinute}
                      onChange={(e) => setStartMinute(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="00">00</option>
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="45">45</option>
                    </select>
                    <select
                      required
                      value={startPeriod}
                      onChange={(e) => setStartPeriod(e.target.value)}
                      className="col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date & Time *
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="dd/mm/yyyy"
                  />
                  <div className="grid grid-cols-4 gap-2">
                    <select
                      required
                      value={endHour}
                      onChange={(e) => setEndHour(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="">HH</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                        <option key={h} value={String(h).padStart(2, '0')}>
                          {String(h).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                    <select
                      required
                      value={endMinute}
                      onChange={(e) => setEndMinute(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="00">00</option>
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="45">45</option>
                    </select>
                    <select
                      required
                      value={endPeriod}
                      onChange={(e) => setEndPeriod(e.target.value)}
                      className="col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
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
                  placeholder="e.g., Grand Hyatt, Mumbai"
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
                  max="99"
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
                  Photo Quality (%)
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
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Watermark Elements
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {watermarkOptions.map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.watermarkElements.includes(option)}
                      onChange={() => toggleWatermark(option)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Customization */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Page Customization (Optional)</h2>
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
                  Accepted formats: JPG, JPEG, PNG (Max 5MB)
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
                  Accepted formats: JPG, JPEG, PNG (Max 5MB)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Welcome Message
                </label>
                <textarea
                  name="welcomeMessage"
                  value={formData.welcomeMessage}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Welcome to our event! Please scan your face to find your photos."
                />
              </div>
            </div>
          </div>

          {/* Billing Estimate */}
          {billingEstimate && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">💰</span> Estimated Billing
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
                        <span className="text-gray-700">WhatsApp:</span>
                        <span className="font-semibold text-gray-900">{formatINR(billingEstimate.breakdown.whatsapp)}</span>
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
              disabled={loading || logoUploading || welcomeUploading}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-semibold disabled:opacity-50"
            >
              {loading ? 'Creating...' : logoUploading ? 'Uploading Logo...' : welcomeUploading ? 'Uploading Welcome Picture...' : 'Create Event'}
            </button>
            <Link
              href="/admin/events"
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
