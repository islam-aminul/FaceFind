'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Photo {
  photoId: string;
  eventId: string;
  photographerId: string;
  originalUrl?: string;
  processedUrl: string;
  thumbnailUrl: string;
  fileSize?: number;
  dimensions?: string;
  capturedAt?: string;
  uploadedAt: string;
  status: string;
  faceCount?: number;
}

export default function OrganizerEventPhotosPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'ORGANIZER') {
      router.push('/login');
      return;
    }

    setUserId(user.id);
    fetchPhotos(token, user.id);
  }, [router, eventId]);

  const fetchPhotos = async (token: string, userId: string) => {
    try {
      const response = await fetch(`/api/v1/organizer/events/${eventId}/photos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId,
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

  const togglePhotoSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  const selectAll = () => {
    setSelectedPhotos(new Set(photos.map(p => p.photoId)));
  };

  const deselectAll = () => {
    setSelectedPhotos(new Set());
  };

  const downloadSelected = async () => {
    if (selectedPhotos.size === 0) return;

    const photoIds = Array.from(selectedPhotos);

    if (photoIds.length === 1) {
      // Single photo - direct download
      const photo = photos.find(p => p.photoId === photoIds[0]);
      if (photo) {
        window.open(photo.processedUrl, '_blank');
      }
    } else {
      // Multiple photos - download as ZIP
      setDownloading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/v1/photos/download-bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            photoIds,
            eventName: `Event_${eventId}`,
            downloadType: 'zip',
          }),
        });

        if (response.ok) {
          // Get the ZIP file blob
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `photos_${new Date().getTime()}.zip`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          alert('Failed to download photos. Please try again.');
        }
      } catch (error) {
        console.error('Download failed:', error);
        alert('Failed to download photos. Please try again.');
      } finally {
        setDownloading(false);
      }
    }
  };

  const downloadAll = async () => {
    if (photos.length === 0) return;

    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token || !userId) return;

      const response = await fetch(`/api/v1/organizer/events/${eventId}/download-all?downloadType=zip`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId,
        },
      });

      if (response.ok) {
        // Get the ZIP file blob
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `event_${eventId}_all_photos.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download photos. Please try again.');
      }
    } catch (error) {
      console.error('Download all failed:', error);
      alert('Failed to download photos. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href={`/organizer/events/${eventId}`} className="text-blue-600 hover:text-blue-800 text-sm mb-2 block">
            ← Back to Event Details
          </Link>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Event Photos</h1>
            <div className="flex gap-3">
              <button
                onClick={downloadAll}
                disabled={downloading || photos.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading ? '⏳ Preparing ZIP...' : '📥 Download All'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading photos...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No photos yet</h3>
            <p className="text-gray-600">Photos will appear here once photographers upload them</p>
          </div>
        ) : (
          <>
            {/* Selection Controls */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-600">
                    {photos.length} total photos • {selectedPhotos.size} selected
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={selectAll}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAll}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
                  >
                    Deselect All
                  </button>
                  <button
                    onClick={downloadSelected}
                    disabled={selectedPhotos.size === 0 || downloading}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloading ? '⏳ Downloading...' : `Download Selected (${selectedPhotos.size})`}
                  </button>
                </div>
              </div>
            </div>

            {/* Photo Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.photoId}
                  onClick={() => togglePhotoSelection(photo.photoId)}
                  className={`relative cursor-pointer rounded-lg overflow-hidden ${
                    selectedPhotos.has(photo.photoId)
                      ? 'ring-4 ring-blue-500'
                      : 'hover:ring-2 hover:ring-gray-300'
                  }`}
                >
                  <div className="aspect-square bg-gray-100">
                    <Image
                      src={photo.thumbnailUrl}
                      alt={`Photo ${photo.photoId}`}
                      width={400}
                      height={400}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {selectedPhotos.has(photo.photoId) && (
                    <div className="absolute top-2 right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white">
                      ✓
                    </div>
                  )}
                  {photo.faceCount !== undefined && photo.faceCount > 0 && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                      👤 {photo.faceCount}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
