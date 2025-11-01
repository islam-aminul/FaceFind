'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'ADMIN') {
      router.push('/login');
      return;
    }

    setUser(parsedUser);
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 text-sm mb-1 block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Manage system configuration and preferences</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Billing Settings */}
          <Link
            href="/admin/settings/billing"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer"
          >
            <div className="flex items-center mb-4">
              <div className="text-4xl mr-4">💰</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Billing Configuration</h3>
                <p className="text-sm text-gray-600">Configure pricing and cost parameters</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <div>• Profit margin settings</div>
              <div>• AWS cost parameters</div>
              <div>• Retention pricing multipliers</div>
            </div>
          </Link>

          {/* System Settings */}
          <Link
            href="/admin/settings/system"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer"
          >
            <div className="flex items-center mb-4">
              <div className="text-4xl mr-4">⚙️</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">System Settings</h3>
                <p className="text-sm text-gray-600">General system configuration</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <div>• Application settings</div>
              <div>• Maintenance mode</div>
              <div>• Legal documents</div>
            </div>
          </Link>

          {/* Security Settings */}
          <Link
            href="/admin/settings/security"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer"
          >
            <div className="flex items-center mb-4">
              <div className="text-4xl mr-4">🔒</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Security</h3>
                <p className="text-sm text-gray-600">Security and access control</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <div>• Password policies</div>
              <div>• Two-factor authentication</div>
              <div>• Session management</div>
            </div>
          </Link>

          {/* Storage Settings */}
          <Link
            href="/admin/settings/storage"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer"
          >
            <div className="flex items-center mb-4">
              <div className="text-4xl mr-4">💾</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Storage</h3>
                <p className="text-sm text-gray-600">S3 and storage configuration</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <div>• S3 bucket settings</div>
              <div>• Storage quotas</div>
              <div>• Cleanup policies</div>
            </div>
          </Link>

          {/* Face Recognition Settings */}
          <Link
            href="/admin/settings/face-recognition"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer"
          >
            <div className="flex items-center mb-4">
              <div className="text-4xl mr-4">👤</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Face Recognition</h3>
                <p className="text-sm text-gray-600">Rekognition configuration</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <div>• Default confidence threshold</div>
              <div>• Collection management</div>
              <div>• Face detection settings</div>
            </div>
          </Link>

          {/* Notifications Settings */}
          <Link
            href="/admin/settings/notifications"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer"
          >
            <div className="flex items-center mb-4">
              <div className="text-4xl mr-4">📧</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                <p className="text-sm text-gray-600">Email and WhatsApp setup</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <div>• Email configuration</div>
              <div>• WhatsApp Business API</div>
              <div>• Notification preferences</div>
            </div>
          </Link>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <span className="text-green-600 text-2xl">✅</span>
            <div>
              <h3 className="font-semibold text-green-900 mb-2">Settings Implementation Complete</h3>
              <p className="text-sm text-green-800 mb-2">
                All settings modules are now fully functional with both backend APIs and user interfaces.
              </p>
              <ul className="text-sm text-green-700 list-disc list-inside space-y-1">
                <li><strong>All 6 modules:</strong> Billing, System, Security, Storage, Face Recognition, and Notifications</li>
                <li>All settings are stored in DynamoDB with proper defaults</li>
                <li>Each module has GET/PUT API endpoints with authentication</li>
                <li>Click any module above to configure its settings</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
