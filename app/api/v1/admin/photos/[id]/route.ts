import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { s3Service } from '@/lib/aws/s3';

const client = generateClient<Schema>();

// DELETE - Delete a photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const photoId = params.id;

    // Get photo
    const { data: photo } = await client.models.Photo.get({ id: photoId });

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    // Delete from S3 (both original and processed)
    try {
      const originalKey = photo.originalUrl.split('.amazonaws.com/')[1];
      const processedKey = photo.processedUrl?.split('.amazonaws.com/')[1];
      const thumbnailKey = photo.thumbnailUrl?.split('.amazonaws.com/')[1];

      if (originalKey) await s3Service.deleteFile(originalKey);
      if (processedKey) await s3Service.deleteFile(processedKey);
      if (thumbnailKey) await s3Service.deleteFile(thumbnailKey);
    } catch (s3Error) {
      console.error('S3 deletion error:', s3Error);
      // Continue even if S3 deletion fails
    }

    // Delete from DynamoDB
    await client.models.Photo.delete({ id: photoId });

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully',
    });

  } catch (error: any) {
    console.error('Photo deletion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
