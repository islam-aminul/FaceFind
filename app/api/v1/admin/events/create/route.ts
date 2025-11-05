import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import '@/lib/amplify-config';
import { calculateEventBilling } from '@/lib/utils/billing-calculator';
import { settingsService } from '@/lib/services/settings-service';
import { rekognitionService } from '@/lib/services/rekognition-service';
import { emailService } from '@/lib/aws/ses';

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

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
      console.error('Missing required fields:', { eventName, organizerId, startDateTime, endDateTime, location });
      return NextResponse.json(
        {
          error: 'Missing required fields',
          received: { eventName: !!eventName, organizerId: !!organizerId, startDateTime: !!startDateTime, endDateTime: !!endDateTime, location: !!location }
        },
        { status: 400 }
      );
    }

    // Get default configurations from settings
    const [faceRecognitionConfig, systemConfig] = await Promise.all([
      settingsService.getFaceRecognitionConfig(),
      settingsService.getSystemConfig(),
    ]);

    // Calculate billing automatically
    const billing = await calculateEventBilling({
      estimatedAttendees: estimatedAttendees || 100,
      maxPhotos: maxPhotos || 500,
      retentionPeriodDays: retentionPeriodDays || systemConfig.defaultRetentionPeriodDays,
      confidenceThreshold: confidenceThreshold || faceRecognitionConfig.defaultConfidenceThreshold,
      photoResizeWidth: photoResizeWidth || 2560,
      photoResizeHeight: photoResizeHeight || 1440,
    });

    // Generate Rekognition collection ID with configured prefix
    const rekognitionCollectionId = `${faceRecognitionConfig.collectionPrefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create event in database with settings-based defaults
    const result = await client.models.Event.create({
      eventName,
      organizerId,
      startDateTime,
      endDateTime,
      location,
      estimatedAttendees: estimatedAttendees || 100,
      maxPhotos: maxPhotos || 500,
      gracePeriodDays: Math.ceil((gracePeriodHours || systemConfig.defaultGracePeriodHours) / 24), // Store as days but accept hours
      retentionPeriodDays: retentionPeriodDays || systemConfig.defaultRetentionPeriodDays,
      confidenceThreshold: confidenceThreshold || faceRecognitionConfig.defaultConfidenceThreshold,
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

    // Create Rekognition collection for face indexing
    try {
      await rekognitionService.createCollection(rekognitionCollectionId);
      console.log(`Rekognition collection created: ${rekognitionCollectionId}`);
    } catch (error: any) {
      console.error('Failed to create Rekognition collection:', error);
      // Don't fail the event creation, just log the error
      // The collection can be created manually later if needed
    }

    // Send notification email to organizer
    try {
      const { data: organizer } = await client.models.User.get({ id: organizerId });
      if (organizer && organizer.email) {
        const subject = `Event Created: ${eventName}`;
        const htmlBody = `
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Event Created Successfully</h2>
              <p>Hi ${organizer.firstName},</p>
              <p>Your event has been created successfully.</p>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
                <p><strong>Event Name:</strong> ${eventName}</p>
                <p><strong>Location:</strong> ${location}</p>
                <p><strong>Start Date:</strong> ${new Date(startDateTime).toLocaleString()}</p>
                <p><strong>Payment Status:</strong> PENDING</p>
                <p><strong>Amount:</strong> ₹${billing.estimatedPrice.toFixed(2)}</p>
              </div>
              <p>Please contact the admin to complete payment and activate your event.</p>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/organizer/events/${result.data?.id}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Event</a></p>
              <br>
              <p>Best regards,<br>The FaceFind Team</p>
            </body>
          </html>
        `;
        await emailService.sendEmail([organizer.email], subject, htmlBody);
      }
    } catch (error: any) {
      console.error('Failed to send organizer notification:', error);
      // Don't fail the event creation, just log the error
    }

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
