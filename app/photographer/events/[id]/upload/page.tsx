'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Event {
  id: string;
  eventName: string;
  maxPhotos: number;
}

export default function PhotographerUploadPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, [router, eventId]);

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
      }
    } catch (error) {
      console.error('Failed to fetch event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setMessage('Please select files to upload');
      return;
    }

    setUploading(true);
    setMessage('');
    setUploadProgress(0);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Step 1: Get presigned URLs from API
      const files = selectedFiles.map(file => ({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      }));

      const response = await fetch(`/api/v1/photographer/events/${eventId}/photos/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initialize upload');
      }

      const { uploads } = await response.json();

      // Step 2: Upload each file directly to S3
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < uploads.length; i++) {
        const upload = uploads[i];
        const file = selectedFiles[i];

        try {
          // Upload to S3 using presigned URL
          const s3Response = await fetch(upload.uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
              'Content-Type': file.type,
            },
          });

          if (s3Response.ok) {
            successCount++;
          } else {
            failCount++;
            console.error(`Failed to upload ${file.name} to S3`);
          }
        } catch (err) {
          failCount++;
          console.error(`Error uploading ${file.name}:`, err);
        }

        // Update progress
        setUploadProgress(Math.round(((i + 1) / uploads.length) * 100));
      }

      // Show results
      if (failCount === 0) {
        setMessage(`Successfully uploaded ${successCount} photo(s). Photos are being processed and will appear shortly.`);
      } else {
        setMessage(`Uploaded ${successCount} photo(s). ${failCount} failed. Please try again for failed uploads.`);
      }

      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh event data to update photo count
      fetchEvent(token, userId);
    } catch (error: any) {
      setMessage(error.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
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
          <h1 className="text-2xl font-bold text-gray-900">Upload Photos</h1>
          <p className="text-gray-600 mt-1">{event?.eventName}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-md ${message.includes('Success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}

        {/* Upload Area */}
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Select Photos</h2>

          {/* Drag & Drop Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center mb-6">
            <div className="text-6xl mb-4">📤</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Drag & Drop photos here</h3>
            <p className="text-gray-600 mb-4">or</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/raw"
              onChange={handleFileSelect}
              className="hidden"
              id="fileInput"
            />
            <label
              htmlFor="fileInput"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
            >
              Browse Files
            </label>
            <p className="text-sm text-gray-500 mt-4">
              Supported formats: JPEG, PNG, RAW • Max size: 50MB per file
            </p>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 mb-3">
                Selected Files ({selectedFiles.length})
              </h3>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-700">Uploading...</span>
                <span className="text-sm text-gray-700">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0}
            className="w-full px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Photo(s)`}
          </button>
        </div>

        {/* Upload Guidelines */}
        <div className="bg-blue-50 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-blue-900 mb-3">📋 Upload Guidelines</h3>
          <ul className="list-disc list-inside text-blue-800 space-y-2 text-sm">
            <li>Maximum file size: 50MB per photo</li>
            <li>Supported formats: JPEG, PNG</li>
            <li>Batch upload: Up to 100 photos at once</li>
            <li>Total limit: {event?.maxPhotos} photos per event</li>
            <li>Photos are uploaded to secure AWS S3 storage</li>
            <li>Photos will be automatically processed for face detection (coming soon)</li>
            <li>Processing may take a few minutes per photo</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
