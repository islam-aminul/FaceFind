'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NotificationsSettingsPage() {
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
      const response = await fetch('/api/v1/admin/settings/notifications', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      } else {
        setError('Failed to load notification config');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load notification config');
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

      const response = await fetch('/api/v1/admin/settings/notifications', {
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
        setError(errorData.error || 'Failed to save notification config');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save notification config');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading notification settings...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Failed to load notification settings</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Notifications Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Configure email and WhatsApp notifications</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Email Configuration */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Provider
                </label>
                <select
                  value={config.emailProvider}
                  onChange={(e) => setConfig({ ...config, emailProvider: e.target.value })}
                  className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="SES">Amazon SES</option>
                  <option value="SMTP">Custom SMTP</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Email Address
                  </label>
                  <input
                    type="email"
                    value={config.emailFrom}
                    onChange={(e) => setConfig({ ...config, emailFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="noreply@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Name
                  </label>
                  <input
                    type="text"
                    value={config.emailFromName}
                    onChange={(e) => setConfig({ ...config, emailFromName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="FaceFind"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SMTP Configuration (shown only if SMTP is selected) */}
          {config.emailProvider === 'SMTP' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">SMTP Configuration</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={config.smtpHost || ''}
                      onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="smtp.example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      value={config.smtpPort}
                      onChange={(e) => setConfig({ ...config, smtpPort: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="587"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Username
                    </label>
                    <input
                      type="text"
                      value={config.smtpUsername || ''}
                      onChange={(e) => setConfig({ ...config, smtpUsername: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Password
                    </label>
                    <input
                      type="password"
                      value={config.smtpPassword || ''}
                      onChange={(e) => setConfig({ ...config, smtpPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp Configuration */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">WhatsApp Configuration</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.whatsappEnabled}
                  onChange={(e) => setConfig({ ...config, whatsappEnabled: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Enable WhatsApp notifications
                </label>
              </div>

              {config.whatsappEnabled && (
                <div className="space-y-4 pl-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      WhatsApp Business API Key
                    </label>
                    <input
                      type="password"
                      value={config.whatsappApiKey || ''}
                      onChange={(e) => setConfig({ ...config, whatsappApiKey: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="••••••••••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      WhatsApp Business Phone Number
                    </label>
                    <input
                      type="tel"
                      value={config.whatsappPhoneNumber || ''}
                      onChange={(e) => setConfig({ ...config, whatsappPhoneNumber: e.target.value })}
                      className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="+1234567890"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notification Preferences */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.sendWelcomeEmails}
                  onChange={(e) => setConfig({ ...config, sendWelcomeEmails: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Send welcome emails to new users
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.sendEventReminders}
                  onChange={(e) => setConfig({ ...config, sendEventReminders: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Send event reminders to organizers
                </label>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2">
              <span className="text-blue-600 text-lg">ℹ️</span>
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">About Notifications:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Amazon SES is recommended for production use (lower cost, higher reliability)</li>
                  <li>SMTP can be used for testing or custom email providers</li>
                  <li>WhatsApp Business API requires approval from Meta</li>
                  <li>All notification credentials are encrypted at rest</li>
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
