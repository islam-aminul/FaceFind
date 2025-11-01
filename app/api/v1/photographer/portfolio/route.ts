import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import '@/lib/amplify-config';

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const photographerId = request.headers.get('x-user-id');
    if (!photographerId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    // Fetch photographer details
    const userResult = await client.models.User.get({ id: photographerId });

    if (userResult.errors || !userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.data;

    // Fetch statistics
    const assignmentsResult = await client.models.PhotographerAssignment.list({
      filter: {
        photographerId: { eq: photographerId }
      }
    });

    const photosResult = await client.models.Photo.list({
      filter: {
        photographerId: { eq: photographerId }
      }
    });

    const totalEvents = assignmentsResult.data?.length || 0;
    const totalPhotos = photosResult.data?.length || 0;

    return NextResponse.json({
      success: true,
      portfolio: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        portfolioUrl: user.portfolioUrl,
        specialization: user.specialization,
        bio: user.bio,
        totalEvents,
        totalPhotos,
        averagePhotos: totalEvents > 0 ? Math.round(totalPhotos / totalEvents) : 0,
        memberSince: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Portfolio fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const photographerId = request.headers.get('x-user-id');
    if (!photographerId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const body = await request.json();
    const { portfolioUrl, specialization, bio } = body;

    // Update photographer details
    const updateData: any = {};
    if (portfolioUrl !== undefined) updateData.portfolioUrl = portfolioUrl;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (bio !== undefined) updateData.bio = bio;

    const result = await client.models.User.update({
      id: photographerId,
      ...updateData,
    });

    if (result.errors) {
      console.error('Portfolio update errors:', result.errors);
      return NextResponse.json(
        { error: 'Failed to update portfolio' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      portfolio: result.data,
    });
  } catch (error: any) {
    console.error('Portfolio update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update portfolio' },
      { status: 500 }
    );
  }
}
