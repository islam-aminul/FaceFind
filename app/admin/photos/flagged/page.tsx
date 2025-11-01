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

export default function FlaggedPhotosPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
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

    fetchFlaggedPhotos(token);
  }, [router]);

  const fetchFlaggedPhotos = async (token: string) => {
    try {
      const response = await fetch('/api/v1/admin/photos?flaggedOnly=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos || []);
      }
    } catch (error) {
      console.error('Failed to fetch flagged photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnflagPhoto = async (photo: Photo) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Unflag Photo',
      message: 'Are you sure you want to unflag this photo and restore it to LIVE status?',
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
              message: 'Photo unflagged and restored successfully',
            });
            fetchFlaggedPhotos(token!);
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
      title: 'Delete Flagged Photo',
      message: 'Are you sure you want to permanently delete this photo? This action cannot be undone.',
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
            fetchFlaggedPhotos(token!);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/admin/photos" className="text-blue-600 hover:text-blue-800 text-sm mb-1 block">
            ← Back to All Photos
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Flagged Content Review</h1>
          <p className="text-sm text-gray-600 mt-1">
            Review and moderate flagged photos
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading flagged photos...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Flagged Content</h3>
            <p className="text-gray-600 mb-6">
              All photos are in good standing. No content requires moderation at this time.
            </p>
            <Link
              href="/admin/photos"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              View All Photos
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="text-yellow-800 text-sm">
                  <strong>⚠️ Action Required:</strong> You have {photos.length} flagged photo{photos.length !== 1 ? 's' : ''} requiring review.
                  Review each item and either restore or delete.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {photos.map((photo) => (
                <div key={photo.id} className="bg-white rounded-lg shadow overflow-hidden border-2 border-red-300">
                  <div className="relative aspect-square">
                    {photo.thumbnailUrl ? (
                      <Image
                        src={photo.thumbnailUrl}
                        alt="Flagged photo"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400">No preview</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="px-3 py-1 bg-red-600 text-white text-xs rounded-full font-semibold">
                        FLAGGED
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-900 mb-1">Event: {photo.eventName}</p>
                      <p className="text-sm text-gray-600 mb-1">Photographer: {photo.photographerName}</p>
                      <p className="text-xs text-gray-500">
                        Flagged: {new Date(photo.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {photo.flagReason && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-xs font-semibold text-red-900 mb-1">Reason for Flagging:</p>
                        <p className="text-sm text-red-800">{photo.flagReason}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUnflagPhoto(photo)}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-medium"
                      >
                        ✓ Restore
                      </button>
                      <button
                        onClick={() => handleDeletePhoto(photo)}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 font-medium"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-sm text-gray-600 text-center">
              Reviewing {photos.length} flagged photo{photos.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </main>

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
