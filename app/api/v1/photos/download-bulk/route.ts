import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import archiver from 'archiver';
import { s3Service } from '@/lib/aws/s3';

const client = generateClient<Schema>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { photoIds, eventName } = body;

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { error: 'Photo IDs are required' },
        { status: 400 }
      );
    }

    if (photoIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 photos per download' },
        { status: 400 }
      );
    }

    // Fetch all photos
    const photos = [];
    for (const photoId of photoIds) {
      const { data: photo } = await client.models.Photo.get({ id: photoId });
      if (photo) {
        photos.push(photo);
      }
    }

    if (photos.length === 0) {
      return NextResponse.json(
        { error: 'No valid photos found' },
        { status: 404 }
      );
    }

    // For now, generate presigned URLs for download
    // In production with Lambda, you'd stream the actual files
    const photoUrls = await Promise.all(
      photos.map(async (photo, index) => {
        const url = photo.processedUrl || photo.originalUrl;
        const extension = url.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `photo_${(index + 1).toString().padStart(3, '0')}.${extension}`;

        // Extract S3 key from URL
        const key = url.split('.amazonaws.com/')[1];

        // Generate presigned URL (24 hour expiry)
        const presignedUrl = key ? await s3Service.getPresignedUrl(key, 86400) : url;

        return {
          fileName,
          url: presignedUrl,
          originalUrl: url,
        };
      })
    );

    // Return JSON with presigned URLs for client-side download
    // Client will download each file and create ZIP locally
    const filename = eventName
      ? `${eventName.replace(/[^a-z0-9]/gi, '_')}_photos`
      : `photos_${new Date().getTime()}`;

    return NextResponse.json({
      success: true,
      filename,
      photos: photoUrls,
      count: photoUrls.length,
      message: 'Download URLs generated. Use client-side ZIP library to bundle.',
    });

  } catch (error: any) {
    console.error('Bulk download error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create download' },
      { status: 500 }
    );
  }
}
