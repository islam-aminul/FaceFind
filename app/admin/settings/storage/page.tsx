'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StorageSettingsPage() {
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
      const response = await fetch('/api/v1/admin/settings/storage', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      } else {
        setError('Failed to load storage config');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load storage config');
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

      const response = await fetch('/api/v1/admin/settings/storage', {
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
        setError(errorData.error || 'Failed to save storage config');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save storage config');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading storage settings...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Failed to load storage settings</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Storage Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Configure S3 storage and CDN settings</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* S3 Configuration */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">S3 Configuration</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    S3 Bucket Name
                  </label>
                  <input
                    type="text"
                    value={config.s3BucketName}
                    onChange={(e) => setConfig({ ...config, s3BucketName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="my-bucket-name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    S3 Region
                  </label>
                  <select
                    value={config.s3Region}
                    onChange={(e) => setConfig({ ...config, s3Region: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="ap-south-1">ap-south-1 (Mumbai)</option>
                    <option value="us-east-1">us-east-1 (N. Virginia)</option>
                    <option value="us-west-2">us-west-2 (Oregon)</option>
                    <option value="eu-west-1">eu-west-1 (Ireland)</option>
                    <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Settings */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Upload Size (MB)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={config.maxUploadSizeMB}
                  onChange={(e) => setConfig({ ...config, maxUploadSizeMB: parseInt(e.target.value) })}
                  className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum file size per upload</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allowed File Types
                </label>
                <div className="space-y-2">
                  {['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].map((type) => (
                    <div key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={config.allowedFileTypes?.includes(type) || false}
                        onChange={(e) => {
                          const types = config.allowedFileTypes || [];
                          if (e.target.checked) {
                            setConfig({ ...config, allowedFileTypes: [...types, type] });
                          } else {
                            setConfig({ ...config, allowedFileTypes: types.filter((t: string) => t !== type) });
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900">
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CDN Settings */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">CDN Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.enableCDN}
                  onChange={(e) => setConfig({ ...config, enableCDN: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Enable CDN (CloudFront)
                </label>
              </div>

              {config.enableCDN && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CDN Domain
                  </label>
                  <input
                    type="text"
                    value={config.cdnDomain || ''}
                    onChange={(e) => setConfig({ ...config, cdnDomain: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="d1234567890.cloudfront.net"
                  />
                  <p className="text-xs text-gray-500 mt-1">CloudFront distribution domain</p>
                </div>
              )}
            </div>
          </div>

          {/* Storage Quotas */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Storage Quotas</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Storage Quota per Event (GB)
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                value={config.storageQuotaPerEventGB}
                onChange={(e) => setConfig({ ...config, storageQuotaPerEventGB: parseInt(e.target.value) })}
                className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum storage allowed per event</p>
            </div>
          </div>

          {/* Auto-Cleanup */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Auto-Cleanup</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.autoCleanupEnabled}
                  onChange={(e) => setConfig({ ...config, autoCleanupEnabled: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Enable automatic cleanup of old files
                </label>
              </div>

              {config.autoCleanupEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cleanup After (Days)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="365"
                    value={config.cleanupAfterDays}
                    onChange={(e) => setConfig({ ...config, cleanupAfterDays: parseInt(e.target.value) })}
                    className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">Delete files older than this many days</p>
                </div>
              )}
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
