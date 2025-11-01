'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  phone?: string;
  companyName?: string;
  portfolioUrl?: string;
  specialization?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
};

export default function UserDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const currentUser = JSON.parse(userData);
    if (currentUser.role !== 'ADMIN') {
      router.push('/login');
      return;
    }

    fetchUser(token);
  }, [router, userId]);

  const fetchUser = async (token: string) => {
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        alert('User not found');
        router.push('/admin/users');
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('User deleted successfully');
        router.push('/admin/users');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: 'bg-green-100 text-green-800',
      SUSPENDED: 'bg-red-100 text-red-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
    };
    return styles[status as keyof typeof styles] || styles.INACTIVE;
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      ADMIN: 'bg-purple-100 text-purple-800',
      ORGANIZER: 'bg-blue-100 text-blue-800',
      PHOTOGRAPHER: 'bg-orange-100 text-orange-800',
    };
    return styles[role as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">User not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/admin/users" className="text-blue-600 hover:text-blue-800 text-sm mb-1 block">
            ← Back to Users
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/admin/users/${userId}/edit`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-semibold"
              >
                Edit User
              </Link>
              {user.role !== 'ADMIN' && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition font-semibold"
                >
                  Delete User
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">First Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.firstName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.lastName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.phone || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Role</dt>
                  <dd className="mt-1">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(user.status)}`}>
                      {user.status}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Role-specific Information */}
            {user.role === 'ORGANIZER' && user.companyName && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Organizer Details</h2>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Company Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.companyName}</dd>
                  </div>
                </dl>
              </div>
            )}

            {user.role === 'PHOTOGRAPHER' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Photographer Details</h2>
                <dl className="space-y-4">
                  {user.specialization && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Specialization</dt>
                      <dd className="mt-1 text-sm text-gray-900">{user.specialization}</dd>
                    </div>
                  )}
                  {user.portfolioUrl && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Portfolio URL</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <a
                          href={user.portfolioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {user.portfolioUrl}
                        </a>
                      </dd>
                    </div>
                  )}
                  {user.bio && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Bio</dt>
                      <dd className="mt-1 text-sm text-gray-900">{user.bio}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Metadata */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">User ID</dt>
                  <dd className="mt-1 text-xs text-gray-900 font-mono break-all">{user.id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created At</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(user.createdAt).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(user.updatedAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Link
                  href={`/admin/users/${userId}/edit`}
                  className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700 transition font-semibold"
                >
                  Edit User
                </Link>
                {user.role === 'PHOTOGRAPHER' && (
                  <Link
                    href={`/admin/events?photographer=${userId}`}
                    className="block w-full px-4 py-2 bg-green-600 text-white text-center rounded-md hover:bg-green-700 transition font-semibold"
                  >
                    View Events
                  </Link>
                )}
                {user.role === 'ORGANIZER' && (
                  <Link
                    href={`/admin/events?organizer=${userId}`}
                    className="block w-full px-4 py-2 bg-green-600 text-white text-center rounded-md hover:bg-green-700 transition font-semibold"
                  >
                    View Events
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
