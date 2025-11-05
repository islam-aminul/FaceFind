import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP } from '@/lib/services/whatsapp-service';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, otp, sessionId } = body;

    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }

    // Verify OTP
    const isValid = verifyOTP(phoneNumber, otp);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // If sessionId provided, update session with phone number
    if (sessionId) {
      try {
        const { data: session } = await client.models.Session.get({ id: sessionId });

        if (session) {
          await client.models.Session.update({
            id: sessionId,
            phoneNumber: phoneNumber, // Consider encrypting in production
            whatsappConsent: true,
          });
        }
      } catch (error) {
        console.error('Failed to update session:', error);
        // Continue even if session update fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Phone number verified successfully',
      phoneNumber,
      verified: true,
    });

  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}
