'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SystemSettingsPage() {
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
      const response = await fetch('/api/v1/admin/settings/system', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      } else {
        setError('Failed to load system config');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load system config');
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

      const response = await fetch('/api/v1/admin/settings/system', {
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
        setError(errorData.error || 'Failed to save system config');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save system config');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading system settings...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Failed to load system settings</p>
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
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-sm text-gray-600 mt-1">General application configuration</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Application Info */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Application Name</label>
                <input
                  type="text"
                  value={config.appName}
                  onChange={(e) => setConfig({ ...config, appName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
                  <input
                    type="email"
                    value={config.supportEmail}
                    onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Support Phone</label>
                  <input
                    type="tel"
                    value={config.supportPhone || ''}
                    onChange={(e) => setConfig({ ...config, supportPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Maintenance Mode */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Mode</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.maintenanceMode}
                  onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Enable Maintenance Mode
                </label>
              </div>

              {config.maintenanceMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maintenance Message</label>
                  <textarea
                    value={config.maintenanceMessage || ''}
                    onChange={(e) => setConfig({ ...config, maintenanceMessage: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Message to display during maintenance"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Registration */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">User Registration</h2>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={config.allowNewRegistrations}
                onChange={(e) => setConfig({ ...config, allowNewRegistrations: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Allow New User Registrations
              </label>
            </div>
          </div>

          {/* Legal URLs */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Legal Documents</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Terms of Service URL</label>
                <input
                  type="url"
                  value={config.termsOfServiceUrl || ''}
                  onChange={(e) => setConfig({ ...config, termsOfServiceUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="https://example.com/terms"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Privacy Policy URL</label>
                <input
                  type="url"
                  value={config.privacyPolicyUrl || ''}
                  onChange={(e) => setConfig({ ...config, privacyPolicyUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="https://example.com/privacy"
                />
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
