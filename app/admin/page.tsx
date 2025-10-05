'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);

    // Check if user has admin role
    if (parsedUser.role !== 'ADMIN') {
      router.push('/login');
      return;
    }

    setUser(parsedUser);

    // Fetch dashboard stats
    fetchStats(token);
  }, [router]);

  const fetchStats = async (token: string) => {
    try {
      const response = await fetch('/api/v1/admin/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">FaceFind Admin</h1>
            <p className="text-sm text-gray-600">Welcome, {user.firstName} {user.lastName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Stats Cards */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {loading ? '...' : stats?.users?.total || 0}
            </p>
            {stats?.users?.byRole && (
              <div className="mt-2 text-xs text-gray-600">
                <div>Admins: {stats.users.byRole.ADMIN}</div>
                <div>Organizers: {stats.users.byRole.ORGANIZER}</div>
                <div>Photographers: {stats.users.byRole.PHOTOGRAPHER}</div>
              </div>
            )}
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Events</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {loading ? '...' : stats?.events?.total || 0}
            </p>
            {stats?.events && (
              <div className="mt-2 text-xs text-gray-600">
                <div>Active: {stats.events.active}</div>
                <div>Paid: {stats.events.paid}</div>
              </div>
            )}
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Photos</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {loading ? '...' : stats?.photos?.total || 0}
            </p>
            {stats?.photos && (
              <div className="mt-2 text-xs text-gray-600">
                <div>Live: {stats.photos.live}</div>
                <div>Flagged: {stats.photos.flagged}</div>
              </div>
            )}
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Storage Used</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {loading ? '...' : stats?.storage?.totalGB || 0} GB
            </p>
            <p className="mt-2 text-xs text-gray-600">
              Across all events
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/admin/users"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition text-center"
            >
              <div className="text-blue-600 text-3xl mb-2">👥</div>
              <h3 className="font-semibold text-gray-900">Manage Users</h3>
              <p className="text-sm text-gray-600">View and manage all users</p>
            </Link>

            <Link
              href="/admin/events"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition text-center"
            >
              <div className="text-blue-600 text-3xl mb-2">📅</div>
              <h3 className="font-semibold text-gray-900">Manage Events</h3>
              <p className="text-sm text-gray-600">View all events</p>
            </Link>

            <Link
              href="/admin/photographers"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition text-center"
            >
              <div className="text-blue-600 text-3xl mb-2">📷</div>
              <h3 className="font-semibold text-gray-900">Photographers</h3>
              <p className="text-sm text-gray-600">Manage photographers</p>
            </Link>

            <Link
              href="/admin/settings"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition text-center"
            >
              <div className="text-blue-600 text-3xl mb-2">⚙️</div>
              <h3 className="font-semibold text-gray-900">Settings</h3>
              <p className="text-sm text-gray-600">System settings</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
