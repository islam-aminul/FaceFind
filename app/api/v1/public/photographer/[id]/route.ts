/**
 * Public Photographer Profile API
 *
 * Returns public information about a photographer including:
 * - Basic info (name, bio, specialization)
 * - Statistics (events, photos)
 * - Portfolio URL
 *
 * No authentication required - this is a public endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>({ authMode: 'apiKey' });

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const photographerId = params.id;

    // Get photographer details
    const { data: photographer, errors: photographerErrors } = await client.models.User.get({
      id: photographerId
    });

    if (photographerErrors || !photographer) {
      return NextResponse.json(
        { error: 'Photographer not found' },
        { status: 404 }
      );
    }

    // Verify user is a photographer
    if (photographer.role !== 'PHOTOGRAPHER') {
      return NextResponse.json(
        { error: 'User is not a photographer' },
        { status: 404 }
      );
    }

    // Verify photographer is active
    if (photographer.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Photographer profile is not available' },
        { status: 404 }
      );
    }

    // Get photographer's assignments
    const { data: assignments } = await client.models.PhotographerAssignment.list({
      filter: { photographerId: { eq: photographerId } }
    });

    const totalEvents = assignments?.length || 0;

    // Get photographer's photos
    const { data: photos } = await client.models.Photo.list({
      filter: { photographerId: { eq: photographerId } }
    });

    const totalPhotos = photos?.length || 0;
    const livePhotos = photos?.filter(p => p.status === 'LIVE').length || 0;

    // Get unique events from photos
    const eventIds = new Set(photos?.map(p => p.eventId) || []);
    const eventsWithPhotos = eventIds.size;

    // Calculate average photos per event
    const avgPhotosPerEvent = eventsWithPhotos > 0
      ? Math.round(livePhotos / eventsWithPhotos)
      : 0;

    // Return public profile data
    return NextResponse.json({
      photographerId: photographer.id,
      name: `${photographer.firstName} ${photographer.lastName}`,
      email: photographer.email, // Can be hidden if needed
      specialization: photographer.specialization || 'Event Photography',
      bio: photographer.bio || '',
      portfolioUrl: photographer.portfolioUrl || '',
      stats: {
        totalEvents,
        eventsWithPhotos,
        totalPhotos,
        livePhotos,
        avgPhotosPerEvent,
      },
      joinedAt: photographer.createdAt,
    });

  } catch (error: any) {
    console.error('Error fetching photographer profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photographer profile', message: error.message },
      { status: 500 }
    );
  }
}
