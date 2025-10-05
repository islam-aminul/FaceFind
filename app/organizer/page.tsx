'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OrganizerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);

    // Check if user has organizer role
    if (parsedUser.role !== 'ORGANIZER') {
      router.push('/login');
      return;
    }

    setUser(parsedUser);
  }, [router]);

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
            <h1 className="text-2xl font-bold text-gray-900">Event Organizer Dashboard</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Stats Cards */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">My Events</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Active Events</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Photos</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">My Events</h2>
            <Link
              href="/organizer/events/create"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              + Create Event
            </Link>
          </div>
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-lg font-medium mb-2">No events yet</p>
            <p className="text-sm">Create your first event to get started</p>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/organizer/events"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition text-center"
            >
              <div className="text-blue-600 text-3xl mb-2">📅</div>
              <h3 className="font-semibold text-gray-900">My Events</h3>
              <p className="text-sm text-gray-600">View all your events</p>
            </Link>

            <Link
              href="/organizer/billing"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition text-center"
            >
              <div className="text-blue-600 text-3xl mb-2">💳</div>
              <h3 className="font-semibold text-gray-900">Billing</h3>
              <p className="text-sm text-gray-600">Payment history</p>
            </Link>

            <Link
              href="/organizer/profile"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition text-center"
            >
              <div className="text-blue-600 text-3xl mb-2">👤</div>
              <h3 className="font-semibold text-gray-900">Profile</h3>
              <p className="text-sm text-gray-600">Manage your profile</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
