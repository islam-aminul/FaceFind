'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

interface Event {
  eventId: string;
  eventName: string;
  eventLogoUrl?: string;
  welcomeMessage?: string;
  welcomePictureUrl?: string;
  status: string;
}

interface Photo {
  photoId: string;
  thumbnailUrl: string;
  processedUrl: string;
}

export default function EventPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [session, setSession] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadEvent();
    checkExistingSession();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/landing`);
      if (!response.ok) throw new Error('Event not found');

      const data = await response.json();
      setEvent(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingSession = () => {
    const existingSession = localStorage.getItem(`session_${eventId}`);
    if (existingSession) {
      setSession(existingSession);
      loadPhotos(existingSession);
    }
  };

  const loadPhotos = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/my-photos?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Failed to load photos');

      const data = await response.json();
      setPhotos(data.photos);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err: any) {
      setError('Failed to access camera. Please grant camera permission.');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setScanning(true);
    setError('');

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      ctx.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      const base64Data = imageData.split(',')[1];

      // Generate device fingerprint
      const deviceFingerprint = await generateDeviceFingerprint();

      const response = await fetch(`/api/events/${eventId}/scan-face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faceImageData: base64Data,
          deviceFingerprint,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Face scan failed');
      }

      const data = await response.json();

      // Store session
      localStorage.setItem(`session_${eventId}`, data.sessionId);
      setSession(data.sessionId);
      setPhotos(data.matchedPhotos);

      stopCamera();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  const generateDeviceFingerprint = async (): Promise<string> => {
    const userAgent = navigator.userAgent;
    const screenResolution = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;

    const fingerprint = `${userAgent}|${screenResolution}|${timezone}|${language}|${Date.now()}`;

    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
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

  const downloadSelected = async () => {
    if (selectedPhotos.size === 0) return;

    const photoIds = Array.from(selectedPhotos);

    if (photoIds.length === 1) {
      // Single photo download
      const photo = photos.find((p) => p.photoId === photoIds[0]);
      if (photo) {
        window.open(photo.processedUrl, '_blank');
      }
    } else {
      // Bulk download (ZIP)
      try {
        const response = await fetch('/api/photos/download-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoIds }),
        });

        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${event?.eventName || 'photos'}.zip`;
        a.click();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Event not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          {event.eventLogoUrl && (
            <div className="mb-4 flex justify-center">
              <Image src={event.eventLogoUrl} alt={event.eventName} width={150} height={150} />
            </div>
          )}
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{event.eventName}</h1>
          {event.welcomeMessage && (
            <p className="text-lg text-gray-600">{event.welcomeMessage}</p>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Main Content */}
        {!session && !showCamera && (
          <div className="text-center">
            {event.welcomePictureUrl && (
              <div className="mb-8 flex justify-center">
                <Image
                  src={event.welcomePictureUrl}
                  alt="Welcome"
                  width={600}
                  height={400}
                  className="rounded-lg shadow-lg"
                />
              </div>
            )}
            <button
              onClick={startCamera}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-lg"
            >
              📸 Scan Your Face to Find Your Photos
            </button>
            <p className="mt-4 text-sm text-gray-600">
              No account needed • Privacy protected • Instant results
            </p>
          </div>
        )}

        {showCamera && (
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Face Scanning</h2>
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg border-4 border-blue-500"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="mt-4 flex gap-4 justify-center">
              <button
                onClick={captureFace}
                disabled={scanning}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
              >
                {scanning ? 'Scanning...' : 'Capture & Find Photos'}
              </button>
              <button
                onClick={stopCamera}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
              >
                Cancel
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-600 text-center">
              Position your face in the center and click Capture
            </p>
          </div>
        )}

        {session && photos.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                Your Photos ({photos.length})
              </h2>
              <div className="flex gap-4">
                <button
                  onClick={downloadSelected}
                  disabled={selectedPhotos.size === 0}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50"
                >
                  Download Selected ({selectedPhotos.size})
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem(`session_${eventId}`);
                    setSession(null);
                    setPhotos([]);
                    setSelectedPhotos(new Set());
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  Rescan Face
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                  <Image
                    src={photo.thumbnailUrl}
                    alt="Photo"
                    width={400}
                    height={400}
                    className="w-full h-full object-cover"
                  />
                  {selectedPhotos.has(photo.photoId) && (
                    <div className="absolute top-2 right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white">
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {session && photos.length === 0 && (
          <div className="text-center bg-white rounded-lg shadow-lg p-12">
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-2xl font-bold mb-2">No Photos Found</h2>
            <p className="text-gray-600 mb-6">
              We couldn't find any photos of you at this event yet. Please check back later!
            </p>
            <button
              onClick={() => {
                localStorage.removeItem(`session_${eventId}`);
                setSession(null);
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
