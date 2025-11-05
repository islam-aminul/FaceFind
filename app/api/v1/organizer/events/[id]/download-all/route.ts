import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { s3Service } from '@/lib/aws/s3';
import archiver from 'archiver';
import { Readable } from 'stream';

const client = generateClient<Schema>();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const organizerId = request.headers.get('X-User-Id');
    const { searchParams } = new URL(request.url);
    const downloadType = searchParams.get('downloadType') || 'urls';

    if (!organizerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get event and verify organizer ownership
    const { data: event } = await client.models.Event.get({ id: eventId });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    if (event.organizerId !== organizerId) {
      return NextResponse.json(
        { error: 'Access denied. You are not the organizer of this event.' },
        { status: 403 }
      );
    }

    // Get all photos for this event (only LIVE photos)
    const { data: photos } = await client.models.Photo.list({
      filter: {
        and: [
          { eventId: { eq: eventId } },
          { status: { eq: 'LIVE' } }
        ]
      }
    });

    if (!photos || photos.length === 0) {
      return NextResponse.json(
        { error: 'No photos found for this event' },
        { status: 404 }
      );
    }

    const filename = event.eventName
      ? `${event.eventName.replace(/[^a-z0-9]/gi, '_')}_all_photos`
      : `event_${eventId}_photos`;

    // If downloadType is 'zip', create actual ZIP file
    if (downloadType === 'zip') {
      // Create ZIP archive
      const archive = archiver('zip', {
        zlib: { level: 6 }
      });

      // Set response headers for ZIP download
      const headers = new Headers();
      headers.set('Content-Type', 'application/zip');
      headers.set('Content-Disposition', `attachment; filename="${filename}.zip"`);

      // Group photos by photographer for better organization
      const byPhotographer: Record<string, typeof photos> = {};
      photos.forEach(photo => {
        const key = photo.photographerName || 'unknown';
        if (!byPhotographer[key]) {
          byPhotographer[key] = [];
        }
        byPhotographer[key].push(photo);
      });

      // Add photos to ZIP, organized by photographer
      for (const [photographerName, photographerPhotos] of Object.entries(byPhotographer)) {
        let photoIndex = 1;
        for (const photo of photographerPhotos) {
          try {
            const url = photo.processedUrl || photo.originalUrl;
            const extension = url.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${photographerName}/${photoIndex.toString().padStart(4, '0')}.${extension}`;

            // Extract S3 key from URL
            const key = url.split('.amazonaws.com/')[1];

            if (key) {
              // Download photo from S3
              const photoBuffer = await s3Service.getObject(key);

              // Add to archive in photographer folder
              archive.append(photoBuffer, { name: fileName });
              photoIndex++;
            }
          } catch (error) {
            console.error(`Failed to add photo to ZIP:`, error);
            // Continue with other photos
          }
        }
      }

      // Finalize archive
      await archive.finalize();

      // Convert archive stream to Response
      const stream = Readable.toWeb(archive as any);
      return new Response(stream, { headers });
    }

    // Default: Generate presigned URLs for all photos
    const photoUrls = await Promise.all(
      photos.map(async (photo, index) => {
        const url = photo.processedUrl || photo.originalUrl;
        const extension = url.split('.').pop()?.toLowerCase() || 'jpg';
        const photographerName = photo.photographerName || 'unknown';
        const fileName = `${photographerName}_${(index + 1).toString().padStart(4, '0')}.${extension}`;

        // Extract S3 key from URL
        const key = url.split('.amazonaws.com/')[1];

        // Generate presigned URL (24 hour expiry)
        const presignedUrl = key ? await s3Service.getPresignedUrl(key, 86400) : url;

        return {
          fileName,
          url: presignedUrl,
          photographerId: photo.photographerId,
          photographerName,
          uploadedAt: photo.createdAt,
        };
      })
    );

    // Group by photographer for better organization
    const byPhotographer: Record<string, typeof photoUrls> = {};
    photoUrls.forEach(photo => {
      const key = photo.photographerName;
      if (!byPhotographer[key]) {
        byPhotographer[key] = [];
      }
      byPhotographer[key].push(photo);
    });

    return NextResponse.json({
      success: true,
      eventName: event.eventName,
      filename,
      totalPhotos: photoUrls.length,
      photos: photoUrls,
      byPhotographer,
      message: 'All event photos ready for download. Add ?downloadType=zip for server-side ZIP.',
    });

  } catch (error: any) {
    console.error('Download all photos error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to prepare download' },
      { status: 500 }
    );
  }
}
