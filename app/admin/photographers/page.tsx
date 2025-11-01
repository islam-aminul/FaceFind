'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Photographer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  portfolioUrl?: string;
  specialization?: string;
  status: string;
  createdAt: string;
}

export default function PhotographersPage() {
  const router = useRouter();
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

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

    fetchPhotographers(token);
  }, [router]);

  const fetchPhotographers = async (token: string) => {
    try {
      const response = await fetch('/api/v1/admin/users/list?role=PHOTOGRAPHER', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPhotographers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch photographers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPhotographers = photographers.filter(photographer => {
    if (statusFilter === 'ALL') return true;
    return photographer.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    const colors: any = {
      ACTIVE: 'bg-green-100 text-green-800',
      SUSPENDED: 'bg-red-100 text-red-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <Link href="/admin" className="text-blue-600 hover:text-blue-800 text-sm mb-1 block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Photographers</h1>
          </div>
          <Link
            href="/admin/users/create"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            + Add Photographer
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {['ALL', 'ACTIVE', 'SUSPENDED', 'INACTIVE'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-md transition ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Photographers List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading photographers...</p>
          </div>
        ) : filteredPhotographers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📷</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No photographers found</h3>
            <p className="text-gray-600 mb-4">
              {statusFilter === 'ALL'
                ? 'Create your first photographer to get started'
                : `No photographers with status: ${statusFilter}`
              }
            </p>
            <Link
              href="/admin/users/create"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Photographer
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Photographer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Specialization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPhotographers.map((photographer) => (
                  <tr key={photographer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {photographer.firstName} {photographer.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{photographer.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{photographer.phone || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {photographer.specialization || 'Not specified'}
                      </div>
                      {photographer.portfolioUrl && (
                        <a
                          href={photographer.portfolioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View Portfolio
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(photographer.status)}`}>
                        {photographer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/admin/users/${photographer.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/users/${photographer.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        {!loading && filteredPhotographers.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            Showing {filteredPhotographers.length} photographer{filteredPhotographers.length !== 1 ? 's' : ''}
            {statusFilter !== 'ALL' && ` with status: ${statusFilter}`}
          </div>
        )}
      </main>
    </div>
  );
}
