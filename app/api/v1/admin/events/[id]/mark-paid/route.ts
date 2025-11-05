import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { emailService } from '@/lib/aws/ses';
import '@/lib/amplify-config';

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { paymentReference, paymentDate } = body;

    // Get current event
    const eventResult = await client.models.Event.get({ id });

    if (eventResult.errors || !eventResult.data) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check if already paid
    if (eventResult.data.paymentStatus === 'PAID') {
      return NextResponse.json(
        { error: 'Event is already marked as paid' },
        { status: 400 }
      );
    }

    // Update event to paid
    const result = await client.models.Event.update({
      id,
      paymentStatus: 'PAID',
      status: 'PAID', // Also update the event status
    });

    if (result.errors) {
      console.error('Mark as paid errors:', result.errors);
      return NextResponse.json(
        { error: 'Failed to mark event as paid', details: result.errors },
        { status: 500 }
      );
    }

    // Send email notification to organizer
    try {
      const { data: organizer } = await client.models.User.get({ id: eventResult.data.organizerId });
      if (organizer && organizer.email && result.data) {
        const subject = `Payment Confirmed: ${result.data.eventName}`;
        const htmlBody = `
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Payment Confirmed</h2>
              <p>Hi ${organizer.firstName},</p>
              <p>Your payment for the event has been confirmed.</p>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
                <p><strong>Event Name:</strong> ${result.data.eventName}</p>
                <p><strong>Location:</strong> ${result.data.location}</p>
                <p><strong>Start Date:</strong> ${new Date(result.data.startDateTime).toLocaleString()}</p>
                <p><strong>Amount Paid:</strong> ₹${result.data.paymentAmount.toFixed(2)}</p>
                ${paymentReference ? `<p><strong>Payment Reference:</strong> ${paymentReference}</p>` : ''}
              </div>
              <p>Your event is now active. You can download the QR code and start uploading photos.</p>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/organizer/events/${result.data.id}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Event</a></p>
              <br>
              <p>Best regards,<br>The FaceFind Team</p>
            </body>
          </html>
        `;
        await emailService.sendEmail([organizer.email], subject, htmlBody);
        console.log(`Payment confirmation email sent to ${organizer.email}`);
      }
    } catch (emailError) {
      console.error('Failed to send payment notification:', emailError);
      // Don't fail the mark-paid operation if email fails
    }

    return NextResponse.json({
      success: true,
      event: result.data,
      message: 'Event marked as paid successfully',
    });
  } catch (error: any) {
    console.error('Mark as paid error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark event as paid' },
      { status: 500 }
    );
  }
}
