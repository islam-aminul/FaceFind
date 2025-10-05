import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import '@/lib/amplify-config';
import { calculateEventBilling } from '@/lib/utils/billing-calculator';

const client = generateClient<Schema>();

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      eventName,
      organizerId,
      startDateTime,
      endDateTime,
      location,
      estimatedAttendees,
      maxPhotos,
      gracePeriodHours,
      retentionPeriodDays,
      confidenceThreshold,
      photoResizeWidth,
      photoResizeHeight,
      photoQuality,
      watermarkElements,
      eventLogoUrl,
      welcomeMessage,
      welcomePictureUrl,
    } = body;

    // Validate required fields
    if (!eventName || !organizerId || !startDateTime || !endDateTime || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate billing automatically
    const billing = calculateEventBilling({
      estimatedAttendees: estimatedAttendees || 100,
      maxPhotos: maxPhotos || 500,
      retentionPeriodDays: retentionPeriodDays || 7,
      confidenceThreshold: confidenceThreshold || 85,
      photoResizeWidth: photoResizeWidth || 2560,
      photoResizeHeight: photoResizeHeight || 1440,
    });

    // Generate Rekognition collection ID
    const rekognitionCollectionId = `event-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create event in database
    const result = await client.models.Event.create({
      eventName,
      organizerId,
      startDateTime,
      endDateTime,
      location,
      estimatedAttendees: estimatedAttendees || 100,
      maxPhotos: maxPhotos || 500,
      gracePeriodDays: Math.ceil((gracePeriodHours || 3) / 24), // Store as days but accept hours
      retentionPeriodDays: retentionPeriodDays || 7,
      confidenceThreshold: confidenceThreshold || 85,
      photoResizeWidth: photoResizeWidth || 2560,
      photoResizeHeight: photoResizeHeight || 1440,
      photoQuality: photoQuality || 85,
      watermarkElements: watermarkElements || [],
      eventLogoUrl: eventLogoUrl || '',
      welcomeMessage: welcomeMessage || '',
      welcomePictureUrl: welcomePictureUrl || '',
      qrCodeUrl: '', // Will be generated later
      paymentStatus: 'PENDING',
      paymentAmount: billing.estimatedPrice,
      status: 'CREATED',
      rekognitionCollectionId,
    });

    if (result.errors) {
      console.error('Event creation errors:', result.errors);
      return NextResponse.json(
        { error: 'Failed to create event', details: result.errors },
        { status: 500 }
      );
    }

    // TODO: Create Rekognition collection
    // TODO: Generate QR code
    // TODO: Send notification to organizer

    return NextResponse.json({
      success: true,
      event: result.data,
      billing: billing, // Include billing details in response
    });
  } catch (error: any) {
    console.error('Event creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create event' },
      { status: 500 }
    );
  }
}
