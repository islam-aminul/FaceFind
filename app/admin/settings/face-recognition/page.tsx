'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function FaceRecognitionSettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
      const response = await fetch('/api/v1/admin/settings/face-recognition', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      } else {
        setError('Failed to load face recognition config');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load face recognition config');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/v1/admin/settings/face-recognition', {
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
        setError(errorData.error || 'Failed to save face recognition config');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save face recognition config');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading face recognition settings...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Failed to load face recognition settings</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/admin/settings" className="text-blue-600 hover:text-blue-800 text-sm mb-1 block">
            ← Back to Settings
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Face Recognition Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Configure AWS Rekognition settings</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Detection Settings */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Face Detection Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Confidence Threshold (%)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="50"
                    max="99"
                    value={config.defaultConfidenceThreshold}
                    onChange={(e) => setConfig({ ...config, defaultConfidenceThreshold: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-lg font-semibold text-blue-600 w-12">
                    {config.defaultConfidenceThreshold}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum confidence score for face matches (higher = stricter)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Faces per Photo
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={config.maxFacesPerPhoto}
                  onChange={(e) => setConfig({ ...config, maxFacesPerPhoto: parseInt(e.target.value) })}
                  className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum number of faces to detect in a single photo
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Face Size (pixels)
                </label>
                <input
                  type="number"
                  min="20"
                  max="200"
                  step="10"
                  value={config.minFaceSize}
                  onChange={(e) => setConfig({ ...config, minFaceSize: parseInt(e.target.value) })}
                  className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ignore faces smaller than this size
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.enableQualityFilter}
                  onChange={(e) => setConfig({ ...config, enableQualityFilter: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Enable quality filter
                </label>
              </div>
              <p className="text-xs text-gray-500 ml-6">
                Automatically filter out low-quality face images
              </p>
            </div>
          </div>

          {/* Collection Management */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Collection Management</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Collection Prefix
                </label>
                <input
                  type="text"
                  value={config.collectionPrefix}
                  onChange={(e) => setConfig({ ...config, collectionPrefix: e.target.value })}
                  className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="facefind"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Prefix for Rekognition collection names (e.g., "facefind-event-123")
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.autoDeleteCollections}
                  onChange={(e) => setConfig({ ...config, autoDeleteCollections: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Auto-delete collections when event is deleted
                </label>
              </div>
              <p className="text-xs text-gray-500 ml-6 text-orange-600">
                Warning: This will permanently delete face data from AWS Rekognition
              </p>
            </div>
          </div>

          {/* AWS Configuration */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">AWS Configuration</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rekognition Region
              </label>
              <select
                value={config.rekognitionRegion}
                onChange={(e) => setConfig({ ...config, rekognitionRegion: e.target.value })}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="ap-south-1">ap-south-1 (Mumbai)</option>
                <option value="us-east-1">us-east-1 (N. Virginia)</option>
                <option value="us-west-2">us-west-2 (Oregon)</option>
                <option value="eu-west-1">eu-west-1 (Ireland)</option>
                <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                AWS region for Rekognition service
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2">
              <span className="text-blue-600 text-lg">ℹ️</span>
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">About Face Recognition:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Higher confidence threshold = fewer false positives but may miss matches</li>
                  <li>Lower confidence threshold = more matches but higher chance of false positives</li>
                  <li>Recommended range: 75-85% for balanced results</li>
                  <li>Quality filter helps reduce processing costs by filtering poor images</li>
                </ul>
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
        </div>
      </main>
    </div>
  );
}
