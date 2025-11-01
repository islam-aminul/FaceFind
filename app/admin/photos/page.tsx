'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

interface Photo {
  id: string;
  eventId: string;
  eventName: string;
  photographerId: string;
  photographerName: string;
  originalUrl: string;
  processedUrl: string;
  thumbnailUrl: string;
  status: string;
  flagReason?: string;
  flaggedBy?: string;
  createdAt: string;
}

export default function AdminPhotosPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
  } | null>(null);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

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

    fetchPhotos(token);
  }, [router, statusFilter]);

  const fetchPhotos = async (token: string) => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/v1/admin/photos?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos || []);
      }
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlagPhoto = async () => {
    if (!selectedPhoto || !flagReason.trim()) {
      setToast({
        type: 'error',
        title: 'Error',
        message: 'Please provide a reason for flagging',
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const userId = JSON.parse(localStorage.getItem('user') || '{}').id;

      const response = await fetch(`/api/v1/admin/photos/${selectedPhoto.id}/flag`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: flagReason }),
      });

      if (response.ok) {
        setToast({
          type: 'success',
          title: 'Success',
          message: 'Photo flagged successfully',
        });
        setShowFlagModal(false);
        setFlagReason('');
        setSelectedPhoto(null);
        fetchPhotos(token!);
      } else {
        const error = await response.json();
        setToast({
          type: 'error',
          title: 'Error',
          message: error.error || 'Failed to flag photo',
        });
      }
    } catch (error) {
      setToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to flag photo',
      });
    }
  };

  const handleUnflagPhoto = async (photo: Photo) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Unflag Photo',
      message: 'Are you sure you want to unflag this photo?',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');

          const response = await fetch(`/api/v1/admin/photos/${photo.id}/unflag`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            setToast({
              type: 'success',
              title: 'Success',
              message: 'Photo unflagged successfully',
            });
            fetchPhotos(token!);
          } else {
            const error = await response.json();
            setToast({
              type: 'error',
              title: 'Error',
              message: error.error || 'Failed to unflag photo',
            });
          }
        } catch (error) {
          setToast({
            type: 'error',
            title: 'Error',
            message: 'Failed to unflag photo',
          });
        }
      },
    });
  };

  const handleDeletePhoto = async (photo: Photo) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Delete Photo',
      message: 'Are you sure you want to delete this photo? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');

          const response = await fetch(`/api/v1/admin/photos/${photo.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            setToast({
              type: 'success',
              title: 'Success',
              message: 'Photo deleted successfully',
            });
            fetchPhotos(token!);
          } else {
            const error = await response.json();
            setToast({
              type: 'error',
              title: 'Error',
              message: error.error || 'Failed to delete photo',
            });
          }
        } catch (error) {
          setToast({
            type: 'error',
            title: 'Error',
            message: 'Failed to delete photo',
          });
        }
      },
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: any = {
      UPLOADING: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-yellow-100 text-yellow-800',
      LIVE: 'bg-green-100 text-green-800',
      FLAGGED: 'bg-red-100 text-red-800',
      DELETED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredPhotos = statusFilter === 'ALL'
    ? photos
    : photos.filter(p => p.status === statusFilter);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 text-sm mb-1 block">
            ← Back to Dashboard
          </Link>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Photo Management</h1>
            <Link
              href="/admin/photos/flagged"
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
            >
              View Flagged Photos
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {['ALL', 'LIVE', 'FLAGGED', 'PROCESSING', 'UPLOADING'].map((status) => (
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

        {/* Photos Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading photos...</p>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📷</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No photos found</h3>
            <p className="text-gray-600">
              {statusFilter === 'ALL'
                ? 'No photos have been uploaded yet'
                : `No photos with status: ${statusFilter}`
              }
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPhotos.map((photo) => (
                <div key={photo.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="relative aspect-square">
                    {photo.thumbnailUrl ? (
                      <Image
                        src={photo.thumbnailUrl}
                        alt="Photo"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400">No preview</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(photo.status)}`}>
                        {photo.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Event: {photo.eventName}</p>
                    <p className="text-sm text-gray-600 mb-3">By: {photo.photographerName}</p>

                    {photo.status === 'FLAGGED' && photo.flagReason && (
                      <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                        <strong>Reason:</strong> {photo.flagReason}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {photo.status !== 'FLAGGED' ? (
                        <button
                          onClick={() => {
                            setSelectedPhoto(photo);
                            setShowFlagModal(true);
                          }}
                          className="flex-1 px-3 py-1.5 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                        >
                          Flag
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnflagPhoto(photo)}
                          className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Unflag
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePhoto(photo)}
                        className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-sm text-gray-600 text-center">
              Showing {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''}
              {statusFilter !== 'ALL' && ` with status: ${statusFilter}`}
            </div>
          </>
        )}
      </main>

      {/* Flag Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Flag Photo</h3>
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Reason for flagging this photo..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
              rows={4}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowFlagModal(false);
                  setFlagReason('');
                  setSelectedPhoto(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleFlagPhoto}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Flag Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <Modal
          isOpen={modal.isOpen}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          onConfirm={modal.onConfirm}
          onClose={() => setModal(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
