import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { s3Service, type PresignedUploadUrl } from '@/lib/aws/s3';

const client = generateClient<Schema>();

interface FileInfo {
  filename: string;
  contentType: string;
  size: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const photographerId = request.headers.get('X-User-Id');

    if (!photographerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { files } = body as { files: FileInfo[] };

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'No files specified' },
        { status: 400 }
      );
    }

    // Validate file count
    if (files.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 files per batch' },
        { status: 400 }
      );
    }

    // Validate file sizes (50MB max per file)
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB
    for (const file of files) {
      if (file.size > maxSizeBytes) {
        return NextResponse.json(
          { error: `File ${file.filename} exceeds 50MB limit` },
          { status: 400 }
        );
      }
    }

    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    for (const file of files) {
      if (!allowedTypes.includes(file.contentType)) {
        return NextResponse.json(
          { error: `File ${file.filename} has invalid type. Only JPEG and PNG are allowed` },
          { status: 400 }
        );
      }
    }

    // Get event details
    const { data: event, errors: eventErrors } = await client.models.Event.get({ id: eventId });

    if (eventErrors || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Verify photographer is assigned to this event
    const { data: assignments } = await client.models.PhotographerAssignment.list({
      filter: {
        and: [
          { eventId: { eq: eventId } },
          { photographerId: { eq: photographerId } }
        ]
      }
    });

    if (!assignments || assignments.length === 0) {
      return NextResponse.json(
        { error: 'Not assigned to this event' },
        { status: 403 }
      );
    }

    // Check current photo count against maxPhotos
    const { data: existingPhotos } = await client.models.Photo.list({
      filter: { eventId: { eq: eventId } }
    });

    const currentPhotoCount = existingPhotos?.length || 0;
    const remainingSlots = event.maxPhotos - currentPhotoCount;

    if (files.length > remainingSlots) {
      return NextResponse.json(
        {
          error: `Event photo limit reached. ${remainingSlots} slots remaining, but trying to upload ${files.length} photos`,
          currentCount: currentPhotoCount,
          maxPhotos: event.maxPhotos,
          remaining: remainingSlots
        },
        { status: 400 }
      );
    }

    // Generate presigned URLs for each file
    const uploadUrls: PresignedUploadUrl[] = await s3Service.getPresignedUploadUrls(
      eventId,
      files.map(f => ({ filename: f.filename, contentType: f.contentType }))
    );

    // Create photo metadata in DynamoDB with UPLOADING status
    const photoRecords = [];

    for (let i = 0; i < uploadUrls.length; i++) {
      const upload = uploadUrls[i];
      const file = files[i];

      // Get photographer name
      const { data: photographer } = await client.models.User.get({ id: photographerId });
      const photographerName = photographer
        ? `${photographer.firstName} ${photographer.lastName}`
        : 'Unknown';

      // Create photo record
      const photoData = {
        id: upload.photoId,
        eventId,
        photographerId,
        photographerName,
        originalUrl: s3Service.getPublicUrl(upload.key),
        processedUrl: '', // Will be set after processing
        thumbnailUrl: '', // Will be set after processing
        fileSize: file.size,
        dimensionsWidth: 0, // Will be set after processing
        dimensionsHeight: 0, // Will be set after processing
        capturedAt: new Date().toISOString(),
        status: 'UPLOADING' as const,
        faceCount: 0, // Will be set after processing
        rekognitionFaceIds: [],
      };

      const { data: photo, errors: photoErrors } = await client.models.Photo.create(photoData);

      if (photoErrors || !photo) {
        console.error('Failed to create photo record:', photoErrors);
        continue;
      }

      photoRecords.push({
        photoId: upload.photoId,
        uploadUrl: upload.uploadUrl,
        key: upload.key,
        filename: file.filename,
      });
    }

    return NextResponse.json({
      success: true,
      uploads: photoRecords,
      message: `Generated presigned URLs for ${photoRecords.length} photo(s)`,
      currentCount: currentPhotoCount,
      maxPhotos: event.maxPhotos,
      remaining: remainingSlots - photoRecords.length,
    });

  } catch (error: any) {
    console.error('Photo upload initialization error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize photo upload' },
      { status: 500 }
    );
  }
}

// GET endpoint to check upload status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const photographerId = request.headers.get('X-User-Id');

    if (!photographerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get event details
    const { data: event } = await client.models.Event.get({ id: eventId });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get current photo count
    const { data: photos } = await client.models.Photo.list({
      filter: { eventId: { eq: eventId } }
    });

    const totalPhotos = photos?.length || 0;
    const photographerPhotos = photos?.filter(p => p.photographerId === photographerId).length || 0;

    return NextResponse.json({
      eventId,
      eventName: event.eventName,
      maxPhotos: event.maxPhotos,
      totalPhotos,
      photographerPhotos,
      remaining: event.maxPhotos - totalPhotos,
      percentUsed: Math.round((totalPhotos / event.maxPhotos) * 100),
    });

  } catch (error: any) {
    console.error('Upload status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check upload status' },
      { status: 500 }
    );
  }
}
