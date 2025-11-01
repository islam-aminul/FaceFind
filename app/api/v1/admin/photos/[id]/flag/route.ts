import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const photoId = params.id;
    const userId = request.headers.get('X-User-Id');
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      );
    }

    // Get photo
    const { data: photo } = await client.models.Photo.get({ id: photoId });

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    // Update photo status to FLAGGED
    const { data: updatedPhoto, errors } = await client.models.Photo.update({
      id: photoId,
      status: 'FLAGGED',
      flaggedBy: userId || undefined,
      flagReason: reason,
    });

    if (errors) {
      console.error('Flag photo errors:', errors);
      return NextResponse.json(
        { error: 'Failed to flag photo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Photo flagged successfully',
      photo: updatedPhoto,
    });

  } catch (error: any) {
    console.error('Flag photo error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to flag photo' },
      { status: 500 }
    );
  }
}
