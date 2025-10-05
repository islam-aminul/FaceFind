'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { calculateEventBilling, formatINR, getCostSummary } from '@/lib/utils/billing-calculator';

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [organizerSearch, setOrganizerSearch] = useState('');
  const [billingEstimate, setBillingEstimate] = useState<any>(null);
  const [formData, setFormData] = useState({
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
    watermarkElements: [] as string[],
    eventLogoUrl: '',
    welcomeMessage: '',
    welcomePictureUrl: '',
  });

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

    fetchOrganizers(token);
  }, [router]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/admin/events/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          paymentAmount: billingEstimate?.estimatedPrice || 15000,
        }),
      });

      if (response.ok) {
        router.push('/admin/events');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create event');
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      alert('Failed to create event');
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
                        <span className="font-medium">{formatINR(billingEstimate.totalAWSCost)}</span>
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
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-semibold disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Event'}
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
