import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import '@/lib/amplify-config';
import QRCode from 'qrcode';
import { uploadToS3 } from '@/lib/aws/s3';

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

    const { id } = params;

    // Get event
    const eventResult = await client.models.Event.get({ id });

    if (eventResult.errors || !eventResult.data) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const event = eventResult.data;

    // Check if QR code already exists
    if (event.qrCodeUrl) {
      return NextResponse.json({
        success: true,
        qrCodeUrl: event.qrCodeUrl,
        message: 'QR code already exists',
      });
    }

    // Generate QR code URL
    const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://facefind.com'}/event/${id}`;

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(eventUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Convert data URL to buffer
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload to S3
    const s3Key = `qr-codes/${id}.png`;
    const uploadResult = await uploadToS3({
      key: s3Key,
      body: buffer,
      contentType: 'image/png',
    });

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: 'Failed to upload QR code to S3' },
        { status: 500 }
      );
    }

    // Update event with QR code URL
    const updateResult = await client.models.Event.update({
      id,
      qrCodeUrl: uploadResult.url,
    });

    if (updateResult.errors) {
      console.error('Failed to update event with QR code:', updateResult.errors);
      return NextResponse.json(
        { error: 'Failed to save QR code URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      qrCodeUrl: uploadResult.url,
      eventUrl,
      message: 'QR code generated successfully',
    });
  } catch (error: any) {
    console.error('QR code generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
