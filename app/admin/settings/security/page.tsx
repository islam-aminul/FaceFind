'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SecuritySettingsPage() {
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
      const response = await fetch('/api/v1/admin/settings/security', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      } else {
        setError('Failed to load security config');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load security config');
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

      const response = await fetch('/api/v1/admin/settings/security', {
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
        setError(errorData.error || 'Failed to save security config');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save security config');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading security settings...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Failed to load security settings</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Security Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Configure password policies and authentication</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Password Requirements */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Password Requirements</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Password Length
                </label>
                <input
                  type="number"
                  min="6"
                  max="32"
                  value={config.minPasswordLength}
                  onChange={(e) => setConfig({ ...config, minPasswordLength: parseInt(e.target.value) })}
                  className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Characters (6-32)</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.requireUppercase}
                    onChange={(e) => setConfig({ ...config, requireUppercase: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Require uppercase letters (A-Z)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.requireLowercase}
                    onChange={(e) => setConfig({ ...config, requireLowercase: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Require lowercase letters (a-z)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.requireNumbers}
                    onChange={(e) => setConfig({ ...config, requireNumbers: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Require numbers (0-9)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.requireSpecialChars}
                    onChange={(e) => setConfig({ ...config, requireSpecialChars: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Require special characters (!@#$%^&*)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password Expiry (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={config.passwordExpiryDays}
                  onChange={(e) => setConfig({ ...config, passwordExpiryDays: parseInt(e.target.value) })}
                  className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">0 = Never expires</p>
              </div>
            </div>
          </div>

          {/* Login Security */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Login Security</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="10"
                    value={config.maxLoginAttempts}
                    onChange={(e) => setConfig({ ...config, maxLoginAttempts: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">Before account lockout</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lockout Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={config.lockoutDurationMinutes}
                    onChange={(e) => setConfig({ ...config, lockoutDurationMinutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">After failed attempts</p>
                </div>
              </div>
            </div>
          </div>

          {/* Session Management */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Management</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Timeout (Minutes)
              </label>
              <input
                type="number"
                min="15"
                max="1440"
                value={config.sessionTimeoutMinutes}
                onChange={(e) => setConfig({ ...config, sessionTimeoutMinutes: parseInt(e.target.value) })}
                className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-logout after inactivity</p>
            </div>
          </div>

          {/* Two-Factor Authentication */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h2>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={config.require2FA}
                onChange={(e) => setConfig({ ...config, require2FA: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Require 2FA for all users
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2 ml-6">
              When enabled, all users must setup 2FA on their next login
            </p>
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
