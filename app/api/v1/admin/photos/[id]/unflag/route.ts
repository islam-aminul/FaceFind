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

    // Get photo
    const { data: photo } = await client.models.Photo.get({ id: photoId });

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    // Update photo status back to LIVE
    const { data: updatedPhoto, errors } = await client.models.Photo.update({
      id: photoId,
      status: 'LIVE',
      flaggedBy: undefined,
      flagReason: undefined,
    });

    if (errors) {
      console.error('Unflag photo errors:', errors);
      return NextResponse.json(
        { error: 'Failed to unflag photo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Photo unflagged successfully',
      photo: updatedPhoto,
    });

  } catch (error: any) {
    console.error('Unflag photo error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to unflag photo' },
      { status: 500 }
    );
  }
}
