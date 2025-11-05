import { NextRequest, NextResponse } from 'next/server';
import { whatsappService, generateOTP, storeOTP } from '@/lib/services/whatsapp-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use E.164 format (e.g., +919876543210)' },
        { status: 400 }
      );
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP (in production, use Redis or DynamoDB with TTL)
    storeOTP(phoneNumber, otp, 10); // 10 minutes expiry

    // Send OTP via WhatsApp
    const sent = await whatsappService.sendOTP(phoneNumber, otp);

    if (!sent) {
      return NextResponse.json(
        {
          error: 'Failed to send OTP. WhatsApp service may not be configured.',
          configured: false
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      expiresIn: 600, // seconds
    });

  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send OTP' },
      { status: 500 }
    );
  }
}
