'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';

type ToastState = {
  show: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
} | null;

type ConfirmModalState = {
  isOpen: boolean;
  userId: string;
  action: 'suspend' | 'reactivate';
  userEmail: string;
} | null;

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  phone?: string;
  companyName?: string;
  specialization?: string;
  createdAt: string;
};

export default function UsersListPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(null);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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

    fetchUsers(token);
  }, [router, roleFilter, statusFilter]);

  const fetchUsers = async (token: string) => {
    setLoading(true);
    try {
      let url = '/api/v1/admin/users/list';
      const params = new URLSearchParams();

      if (roleFilter !== 'ALL') {
        params.append('role', roleFilter);
      }
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!confirmModal) return;
    const userId = confirmModal.userId;

    try {
      setConfirmModal(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setToast({
          show: true,
          type: 'success',
          title: 'User Suspended',
          message: 'User has been suspended successfully',
        });
        fetchUsers(token!);
      } else {
        const error = await response.json();
        setToast({
          show: true,
          type: 'error',
          title: 'Failed to Suspend User',
          message: error.error || 'An error occurred',
        });
      }
    } catch (error) {
      console.error('Failed to suspend user:', error);
      setToast({
        show: true,
        type: 'error',
        title: 'Failed to Suspend User',
        message: 'An unexpected error occurred',
      });
    }
  };

  const handleReactivate = async () => {
    if (!confirmModal) return;
    const userId = confirmModal.userId;

    try {
      setConfirmModal(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/admin/users/${userId}/reactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setToast({
          show: true,
          type: 'success',
          title: 'User Reactivated',
          message: 'User has been reactivated successfully',
        });
        fetchUsers(token!);
      } else {
        const error = await response.json();
        setToast({
          show: true,
          type: 'error',
          title: 'Failed to Reactivate User',
          message: error.error || 'An error occurred',
        });
      }
    } catch (error) {
      console.error('Failed to reactivate user:', error);
      setToast({
        show: true,
        type: 'error',
        title: 'Failed to Reactivate User',
        message: 'An unexpected error occurred',
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) || false);

    return matchesSearch;
  });

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notification */}
      {toast?.show && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirmation Modal */}
      {confirmModal?.isOpen && (
        <Modal
          isOpen={confirmModal.isOpen}
          type="confirm"
          title={confirmModal.action === 'suspend' ? 'Suspend User?' : 'Reactivate User?'}
          message={
            confirmModal.action === 'suspend'
              ? `Are you sure you want to suspend ${confirmModal.userEmail}? They will not be able to log in until reactivated.`
              : `Are you sure you want to reactivate ${confirmModal.userEmail}? They will regain access to the system.`
          }
          confirmText={confirmModal.action === 'suspend' ? 'Suspend' : 'Reactivate'}
          cancelText="Cancel"
          onConfirm={confirmModal.action === 'suspend' ? handleSuspend : handleReactivate}
          onClose={() => setConfirmModal(null)}
        />
      )}

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/admin" className="text-blue-600 hover:text-blue-800 text-sm mb-1 block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            </div>
            <Link
              href="/admin/users/create"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-semibold"
            >
              + Create User
            </Link>
          </div>
        </div>
      </header>

      {/* Filters */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or company..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="ORGANIZER">Organizer</option>
                <option value="PHOTOGRAPHER">Photographer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* User List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">Loading users...</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">No users found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.companyName && (
                          <div className="text-xs text-gray-400">{user.companyName}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/users/${user.id}/edit`}
                          className="text-green-600 hover:text-green-900"
                        >
                          Edit
                        </Link>
                        {user.status === 'ACTIVE' && user.role !== 'ADMIN' && (
                          <button
                            onClick={() => setConfirmModal({
                              isOpen: true,
                              userId: user.id,
                              action: 'suspend',
                              userEmail: user.email,
                            })}
                            className="text-red-600 hover:text-red-900"
                          >
                            Suspend
                          </button>
                        )}
                        {user.status === 'SUSPENDED' && (
                          <button
                            onClick={() => setConfirmModal({
                              isOpen: true,
                              userId: user.id,
                              action: 'reactivate',
                              userEmail: user.email,
                            })}
                            className="text-green-600 hover:text-green-900"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div>
              Showing {filteredUsers.length} of {users.length} users
            </div>
            <div className="flex gap-4">
              <span>Admins: {users.filter(u => u.role === 'ADMIN').length}</span>
              <span>Organizers: {users.filter(u => u.role === 'ORGANIZER').length}</span>
              <span>Photographers: {users.filter(u => u.role === 'PHOTOGRAPHER').length}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
