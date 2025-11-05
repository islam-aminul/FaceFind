'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Event {
  id: string;
  eventName: string;
  maxPhotos: number;
  startDateTime: string;
  endDateTime: string;
}

interface GooglePhoto {
  id: string;
  baseUrl: string;
  filename: string;
  mimeType: string;
  mediaMetadata: {
    creationTime: string;
    width: string;
    height: string;
  };
}

export default function GooglePhotosIntegrationPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Photo listing state
  const [photos, setPhotos] = useState<GooglePhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');

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
    fetchEvent(token, user.id);
    checkConnection(token, user.id);
  }, [router, eventId]);

  useEffect(() => {
    // Check for OAuth callback status
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('google_photos_success');
    const errorParam = urlParams.get('google_photos_error');

    if (success) {
      setMessage('Google Photos connected successfully!');
      setConnected(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (errorParam) {
      setError(`Failed to connect: ${errorParam}`);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchEvent = async (token: string, userId: string) => {
    try {
      const response = await fetch(`/api/v1/photographer/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvent(data.event);

        // Set default date range to event dates
        const start = new Date(data.event.startDateTime).toISOString().split('T')[0];
        const end = new Date(data.event.endDateTime).toISOString().split('T')[0];
        setStartDate(start);
        setEndDate(end);
      }
    } catch (error) {
      console.error('Failed to fetch event:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkConnection = async (token: string, userId: string) => {
    try {
      // Try to list photos - if it fails with NOT_CONNECTED, we're not connected
      const response = await fetch(
        `/api/v1/photographer/google-photos/sync?eventId=${eventId}&startDate=${new Date().toISOString()}&endDate=${new Date().toISOString()}&pageSize=1`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-User-Id': userId,
          },
        }
      );

      if (response.ok) {
        setConnected(true);
      } else {
        const data = await response.json();
        if (data.code === 'NOT_CONNECTED') {
          setConnected(false);
        }
      }
    } catch (error) {
      console.error('Failed to check connection:', error);
      setConnected(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/v1/photographer/google-photos/auth', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate authorization URL');
      }

      const { authUrl } = await response.json();

      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (error: any) {
      setError(error.message || 'Failed to connect to Google Photos');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Photos?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/v1/photographer/google-photos/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId,
        },
      });

      if (response.ok) {
        setMessage('Google Photos disconnected successfully');
        setConnected(false);
        setPhotos([]);
        setSelectedPhotos(new Set());
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to disconnect Google Photos');
    }
  };

  const handleLoadPhotos = async (pageToken?: string) => {
    setLoadingPhotos(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const params = new URLSearchParams({
        eventId,
        startDate,
        endDate,
        pageSize: '50',
      });

      if (pageToken) {
        params.append('pageToken', pageToken);
      }

      const response = await fetch(`/api/v1/photographer/google-photos/sync?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load photos');
      }

      const data = await response.json();

      if (pageToken) {
        // Append to existing photos
        setPhotos([...photos, ...(data.photos || [])]);
      } else {
        // Replace photos
        setPhotos(data.photos || []);
      }

      setNextPageToken(data.nextPageToken || null);
      setMessage(data.message);
    } catch (error: any) {
      setError(error.message || 'Failed to load photos');
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleSelectPhoto = (photoId: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map(p => p.id)));
    }
  };

  const handleImport = async () => {
    if (selectedPhotos.size === 0) {
      setError('Please select at least one photo to import');
      return;
    }

    setImporting(true);
    setError('');
    setImportProgress(`Importing ${selectedPhotos.size} photo(s)...`);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/v1/photographer/google-photos/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          photoIds: Array.from(selectedPhotos),
          startDate,
          endDate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import photos');
      }

      const data = await response.json();
      setMessage(`Successfully imported ${data.imported?.length || 0} photo(s). ${data.failed?.length || 0} failed.`);
      setSelectedPhotos(new Set());

      // Refresh event to update photo count
      fetchEvent(token, userId);
    } catch (error: any) {
      setError(error.message || 'Failed to import photos');
    } finally {
      setImporting(false);
      setImportProgress('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href={`/photographer/events/${eventId}`} className="text-blue-600 hover:text-blue-800 text-sm mb-2 block">
            ← Back to Event Details
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Google Photos Integration</h1>
          <p className="text-gray-600 mt-1">{event?.eventName}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {message && (
          <div className="mb-6 p-4 rounded-md bg-green-50 text-green-800">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-50 text-red-800">
            {error}
          </div>
        )}

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Connection Status</h2>
              <p className="text-sm text-gray-600 mt-1">
                {connected ? '✅ Connected to Google Photos' : '❌ Not connected'}
              </p>
            </div>
            <div>
              {!connected ? (
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {connecting ? 'Connecting...' : 'Connect Google Photos'}
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Photo Browser */}
        {connected && (
          <>
            {/* Date Range Selector */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Date Range</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => handleLoadPhotos()}
                    disabled={loadingPhotos}
                    className="w-full px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition disabled:opacity-50"
                  >
                    {loadingPhotos ? 'Loading...' : 'Load Photos'}
                  </button>
                </div>
              </div>
            </div>

            {/* Photo Grid */}
            {photos.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Photos ({selectedPhotos.size} selected)
                  </h2>
                  <button
                    onClick={handleSelectAll}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    {selectedPhotos.size === photos.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => handleSelectPhoto(photo.id)}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition ${
                        selectedPhotos.has(photo.id)
                          ? 'border-blue-600 ring-2 ring-blue-600'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <img
                        src={`${photo.baseUrl}=w400-h400`}
                        alt={photo.filename}
                        className="w-full h-32 object-cover"
                      />
                      {selectedPhotos.has(photo.id) && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                          ✓
                        </div>
                      )}
                      <div className="p-2 bg-white">
                        <p className="text-xs text-gray-600 truncate">{photo.filename}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Load More */}
                {nextPageToken && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => handleLoadPhotos(nextPageToken)}
                      disabled={loadingPhotos}
                      className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition disabled:opacity-50"
                    >
                      {loadingPhotos ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}

                {/* Import Button */}
                <div className="mt-6">
                  <button
                    onClick={handleImport}
                    disabled={importing || selectedPhotos.size === 0}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? importProgress : `Import ${selectedPhotos.size} Photo(s)`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">📋 Google Photos Integration</h3>
          <ul className="list-disc list-inside text-blue-800 space-y-2 text-sm">
            <li>Connect your Google Photos account to import photos directly</li>
            <li>Select a date range to filter photos (defaults to event dates)</li>
            <li>Preview and select photos you want to import</li>
            <li>Photos will be imported and processed automatically</li>
            <li>Face detection will run on imported photos</li>
            <li>You can disconnect Google Photos at any time</li>
            <li>Imported photos count towards your event photo limit ({event?.maxPhotos} photos)</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
