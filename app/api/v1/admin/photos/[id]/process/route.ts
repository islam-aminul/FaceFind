import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { rekognitionService } from '@/lib/services/rekognition-service';
import { s3Service } from '@/lib/aws/s3';
import '@/lib/amplify-config';

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

/**
 * POST - Manually trigger photo processing
 * This is a temporary endpoint until the full Lambda pipeline is implemented.
 * It allows marking photos as LIVE and optionally indexing faces in Rekognition.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: photoId } = params;
    const body = await request.json();
    const { indexFaces = false } = body;

    // Get photo
    const { data: photo, errors: photoErrors } = await client.models.Photo.get({
      id: photoId
    });

    if (photoErrors || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Get event for Rekognition collection ID
    const { data: event } = await client.models.Event.get({ id: photo.eventId });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    let updateData: any = {
      id: photoId,
      status: 'LIVE',
      processedUrl: photo.originalUrl, // For now, use original as processed
      thumbnailUrl: photo.originalUrl, // For now, use original as thumbnail
    };

    // Optionally index faces in Rekognition
    if (indexFaces) {
      try {
        // Download image from S3
        const imageKey = photo.originalUrl.split('.amazonaws.com/')[1];
        if (!imageKey) {
          throw new Error('Invalid S3 URL');
        }

        const imageBytes = await s3Service.getObject(imageKey);

        // Index faces in Rekognition
        const indexedFaces = await rekognitionService.indexFaces(
          event.rekognitionCollectionId,
          imageBytes,
          photoId
        );

        updateData.faceCount = indexedFaces.length;
        updateData.rekognitionFaceIds = indexedFaces.map(f => f.faceId);

        console.log(`Indexed ${indexedFaces.length} face(s) for photo ${photoId}`);
      } catch (rekognitionError) {
        console.error('Failed to index faces:', rekognitionError);
        // Continue with marking as LIVE even if face indexing fails
        updateData.faceCount = 0;
        updateData.rekognitionFaceIds = [];
      }
    }

    // Update photo status
    const { data: updatedPhoto, errors: updateErrors } = await client.models.Photo.update(updateData);

    if (updateErrors || !updatedPhoto) {
      return NextResponse.json(
        { error: 'Failed to update photo', details: updateErrors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      photo: updatedPhoto,
      message: `Photo processed successfully${indexFaces ? ' with face indexing' : ''}`,
    });
  } catch (error: any) {
    console.error('Photo processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process photo' },
      { status: 500 }
    );
  }
}
