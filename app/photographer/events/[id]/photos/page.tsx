'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Photo {
  photoId: string;
  eventId: string;
  photographerId: string;
  processedUrl: string;
  thumbnailUrl: string;
  uploadedAt: string;
  status: string;
  faceCount?: number;
}

export default function PhotographerEventPhotosPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'PHOTOGRAPHER') {
      router.push('/login');
      return;
    }

    setUserId(user.id);
    fetchPhotos(token, user.id);
  }, [router, eventId]);

  const fetchPhotos = async (token: string, userId: string) => {
    try {
      const response = await fetch(`/api/v1/photographer/events/${eventId}/photos`, {
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

  const myPhotos = photos.filter(p => p.photographerId === userId);
  const otherPhotos = photos.filter(p => p.photographerId !== userId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href={`/photographer/events/${eventId}`} className="text-blue-600 hover:text-blue-800 text-sm mb-2 block">
            ← Back to Event Details
          </Link>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Event Photos</h1>
            <Link
              href={`/photographer/events/${eventId}/upload`}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
            >
              📤 Upload Photos
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading photos...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* My Photos */}
            <div>
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  My Photos ({myPhotos.length})
                </h2>
              </div>

              {myPhotos.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <div className="text-6xl mb-4">📸</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No photos uploaded yet</h3>
                  <p className="text-gray-600 mb-4">Upload photos to get started</p>
                  <Link
                    href={`/photographer/events/${eventId}/upload`}
                    className="inline-block px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    Upload Photos
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {myPhotos.map((photo) => (
                    <div
                      key={photo.photoId}
                      className="relative rounded-lg overflow-hidden group"
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
                      {photo.faceCount !== undefined && photo.faceCount > 0 && (
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                          👤 {photo.faceCount}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition flex gap-2">
                          <a
                            href={photo.processedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm"
                          >
                            View
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Other Photographers' Photos */}
            {otherPhotos.length > 0 && (
              <div>
                <div className="bg-white rounded-lg shadow p-4 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Other Photographers' Photos ({otherPhotos.length})
                  </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {otherPhotos.map((photo) => (
                    <div
                      key={photo.photoId}
                      className="relative rounded-lg overflow-hidden"
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
                      {photo.faceCount !== undefined && photo.faceCount > 0 && (
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                          👤 {photo.faceCount}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No photos at all */}
            {photos.length === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">📸</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No photos yet</h3>
                <p className="text-gray-600">Be the first to upload photos for this event!</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
