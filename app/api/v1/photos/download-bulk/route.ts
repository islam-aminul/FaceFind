import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import archiver from 'archiver';
import { s3Service } from '@/lib/aws/s3';
import { Readable } from 'stream';

const client = generateClient<Schema>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { photoIds, eventName, downloadType = 'urls' } = body;

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
      if (photo && photo.status === 'LIVE') {
        photos.push(photo);
      }
    }

    if (photos.length === 0) {
      return NextResponse.json(
        { error: 'No valid photos found' },
        { status: 404 }
      );
    }

    const filename = eventName
      ? `${eventName.replace(/[^a-z0-9]/gi, '_')}_photos`
      : `photos_${new Date().getTime()}`;

    // If downloadType is 'zip', create actual ZIP file
    if (downloadType === 'zip') {
      // Create ZIP archive
      const archive = archiver('zip', {
        zlib: { level: 6 } // Compression level
      });

      // Set response headers for ZIP download
      const headers = new Headers();
      headers.set('Content-Type', 'application/zip');
      headers.set('Content-Disposition', `attachment; filename="${filename}.zip"`);

      // Stream photos into ZIP
      let photoCount = 0;
      for (const photo of photos) {
        try {
          const url = photo.processedUrl || photo.originalUrl;
          const extension = url.split('.').pop()?.toLowerCase() || 'jpg';
          const fileName = `photo_${(photoCount + 1).toString().padStart(3, '0')}.${extension}`;

          // Extract S3 key from URL
          const key = url.split('.amazonaws.com/')[1];

          if (key) {
            // Download photo from S3
            const photoBuffer = await s3Service.getObject(key);

            // Add to archive
            archive.append(photoBuffer, { name: fileName });
            photoCount++;
          }
        } catch (error) {
          console.error(`Failed to add photo to ZIP:`, error);
          // Continue with other photos
        }
      }

      // Finalize archive
      await archive.finalize();

      // Convert archive stream to Response
      const stream = Readable.toWeb(archive as any);
      return new Response(stream, { headers });
    }

    // Default: Return presigned URLs for client-side download
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

    return NextResponse.json({
      success: true,
      filename,
      photos: photoUrls,
      count: photoUrls.length,
      message: 'Download URLs generated. Set downloadType=zip for server-side ZIP generation.',
    });

  } catch (error: any) {
    console.error('Bulk download error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create download' },
      { status: 500 }
    );
  }
}
