'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BillingSettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

    fetchConfig(token);
  }, [router]);

  const fetchConfig = async (token: string) => {
    try {
      const response = await fetch('/api/v1/admin/settings/billing', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      } else {
        setError('Failed to load billing config');
      }
    } catch (err: any) {
      console.error('Failed to fetch billing config:', err);
      setError(err.message || 'Failed to load billing config');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: number) => {
    setConfig({ ...config, [field]: value });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/v1/admin/settings/billing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save billing config');
      }
    } catch (err: any) {
      console.error('Failed to save billing config:', err);
      setError(err.message || 'Failed to save billing config');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading billing settings...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Failed to load billing settings</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/admin/settings" className="text-blue-600 hover:text-blue-800 text-sm mb-1 block">
            ← Back to Settings
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Billing Calculator Settings</h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure parameters used for automatic event billing calculations
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 space-y-8">
          {/* Photo Assumptions */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Photo Size Assumptions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Original Photo Size (MB)
                </label>
                <input
                  type="number"
                  value={config.avgOriginalPhotoSizeMB}
                  onChange={(e) => handleChange('avgOriginalPhotoSizeMB', parseFloat(e.target.value))}
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Average size of uploaded photos</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Processed Photo Size (MB) ⭐
                </label>
                <input
                  type="number"
                  value={config.avgPhotoSizeAfterProcessingMB}
                  onChange={(e) => handleChange('avgPhotoSizeAfterProcessingMB', parseFloat(e.target.value))}
                  step="0.1"
                  className="w-full px-3 py-2 border border-blue-400 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-blue-50"
                />
                <p className="text-xs text-gray-500 mt-1">After resize & watermark (Default: 5MB)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thumbnail Size (MB)
                </label>
                <input
                  type="number"
                  value={config.thumbnailSizeMB}
                  onChange={(e) => handleChange('thumbnailSizeMB', parseFloat(e.target.value))}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Thumbnail image size</p>
              </div>
            </div>
          </div>

          {/* Usage Assumptions */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">User Behavior Assumptions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avg Scans per Attendee ⭐
                </label>
                <input
                  type="number"
                  value={config.avgScansPerAttendee}
                  onChange={(e) => handleChange('avgScansPerAttendee', parseFloat(e.target.value))}
                  step="0.1"
                  className="w-full px-3 py-2 border border-blue-400 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-blue-50"
                />
                <p className="text-xs text-gray-500 mt-1">Face scan attempts per person (Default: 3)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avg Downloads per Attendee
                </label>
                <input
                  type="number"
                  value={config.avgDownloadsPerAttendee}
                  onChange={(e) => handleChange('avgDownloadsPerAttendee', parseFloat(e.target.value))}
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Photo downloads per person</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avg Photo Views per Attendee
                </label>
                <input
                  type="number"
                  value={config.avgPhotoViewsPerAttendee}
                  onChange={(e) => handleChange('avgPhotoViewsPerAttendee', parseFloat(e.target.value))}
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Photo views in gallery</p>
              </div>
            </div>
          </div>

          {/* Lambda Settings */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lambda Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Memory Allocation (GB)
                </label>
                <input
                  type="number"
                  value={config.lambdaMemoryGB}
                  onChange={(e) => handleChange('lambdaMemoryGB', parseFloat(e.target.value))}
                  step="0.128"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">512MB = 0.512 GB</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avg Execution Time (seconds)
                </label>
                <input
                  type="number"
                  value={config.lambdaAvgExecutionSeconds}
                  onChange={(e) => handleChange('lambdaAvgExecutionSeconds', parseFloat(e.target.value))}
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Average processing time</p>
              </div>
            </div>
          </div>

          {/* Profit & Overhead */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing Strategy</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profit Margin (%) ⭐
                </label>
                <input
                  type="number"
                  value={config.profitMarginPercent}
                  onChange={(e) => handleChange('profitMarginPercent', parseFloat(e.target.value))}
                  step="1"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-blue-400 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-blue-50"
                />
                <p className="text-xs text-gray-500 mt-1">Added on top of AWS costs (Default: 40%)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Processing Overhead (%)
                </label>
                <input
                  type="number"
                  value={Math.round((config.processingOverhead - 1) * 100)}
                  onChange={(e) => handleChange('processingOverhead', 1 + parseFloat(e.target.value) / 100)}
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Buffer for variations</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Storage Overhead (%)
                </label>
                <input
                  type="number"
                  value={Math.round((config.storageOverhead - 1) * 100)}
                  onChange={(e) => handleChange('storageOverhead', 1 + parseFloat(e.target.value) / 100)}
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Metadata & redundancy</p>
              </div>
            </div>
          </div>

          {/* Retention Period Pricing Tiers */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Retention Period Pricing Multipliers</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-3">
                Pricing automatically adjusts based on retention period to account for longer storage commitments and risk:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-white rounded-md p-3 border border-gray-200">
                  <div className="text-xs text-gray-500">0-7 days</div>
                  <div className="text-lg font-bold text-green-600">1.0x</div>
                  <div className="text-xs text-gray-600">Base price</div>
                </div>
                <div className="bg-white rounded-md p-3 border border-gray-200">
                  <div className="text-xs text-gray-500">8-14 days</div>
                  <div className="text-lg font-bold text-blue-600">1.15x</div>
                  <div className="text-xs text-gray-600">+15%</div>
                </div>
                <div className="bg-white rounded-md p-3 border border-gray-200">
                  <div className="text-xs text-gray-500">15-30 days</div>
                  <div className="text-lg font-bold text-yellow-600">1.30x</div>
                  <div className="text-xs text-gray-600">+30%</div>
                </div>
                <div className="bg-white rounded-md p-3 border border-gray-200">
                  <div className="text-xs text-gray-500">31-60 days</div>
                  <div className="text-lg font-bold text-orange-600">1.50x</div>
                  <div className="text-xs text-gray-600">+50%</div>
                </div>
                <div className="bg-white rounded-md p-3 border border-gray-200">
                  <div className="text-xs text-gray-500">61-90 days</div>
                  <div className="text-lg font-bold text-red-600">1.75x</div>
                  <div className="text-xs text-gray-600">+75%</div>
                </div>
                <div className="bg-white rounded-md p-3 border border-gray-200">
                  <div className="text-xs text-gray-500">90+ days</div>
                  <div className="text-lg font-bold text-red-700">2.0x</div>
                  <div className="text-xs text-gray-600">+100%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="space-y-3">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                {error}
              </div>
            )}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              {saved && (
                <span className="text-green-600 font-medium">✓ Settings saved successfully!</span>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2">
              <span className="text-blue-600 text-lg">ℹ️</span>
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">About These Settings:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>⭐ = Key configurable parameters (Profit: 40%, Photo Size: 5MB, Scans: 3)</li>
                  <li>These parameters are used to automatically calculate event pricing</li>
                  <li>Based on real AWS pricing for Mumbai (ap-south-1) region</li>
                  <li>Changes apply to all new event estimates</li>
                  <li>Review and update quarterly as AWS pricing changes</li>
                  <li>Current formula: (AWS Costs × Retention Multiplier × (1 + Overhead)) + Profit Margin</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
