import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import '@/lib/amplify-config';
import QRCode from 'qrcode';
import { uploadToS3 } from '@/lib/aws/s3';
import { createCanvas, loadImage } from 'canvas';

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

    // Get event
    const eventResult = await client.models.Event.get({ id });

    if (eventResult.errors || !eventResult.data) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const event = eventResult.data;

    // Check if QR code already exists with new format (S3 key)
    if (event.qrCodeUrl && !event.qrCodeUrl.startsWith('http')) {
      // QR code exists in new format with S3 key
      // Verify the file exists in S3
      const s3 = new (await import('@/lib/aws/s3')).S3Service();
      const exists = await s3.fileExists(event.qrCodeUrl);

      if (exists) {
        return NextResponse.json({
          success: true,
          s3Key: event.qrCodeUrl,
          message: 'QR code already exists',
        });
      }
      // If file doesn't exist, regenerate below
    }

    // Generate QR code URL (either first time or regenerating)
    const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://facefind.com'}/event/${id}`;

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(eventUrl, {
      width: 400,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Create canvas with event information
    const canvasWidth = 600;
    const canvasHeight = 750;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Header
    ctx.fillStyle = '#2563EB'; // Blue
    ctx.fillRect(0, 0, canvasWidth, 80);

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FaceFind Event', canvasWidth / 2, 50);

    // Event name (monospaced font)
    ctx.fillStyle = '#1F2937'; // Dark gray
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.textAlign = 'center';
    const eventName = event.eventName.length > 35
      ? event.eventName.substring(0, 32) + '...'
      : event.eventName;
    ctx.fillText(eventName, canvasWidth / 2, 125);

    // Event date (monospaced font)
    ctx.font = '18px "Courier New", monospace';
    ctx.fillStyle = '#4B5563'; // Gray
    const eventDate = new Date(event.startDateTime).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    ctx.fillText(eventDate, canvasWidth / 2, 155);

    if (event.location) {
      const location = event.location.length > 40
        ? event.location.substring(0, 37) + '...'
        : event.location;
      ctx.font = '16px "Courier New", monospace';
      ctx.fillStyle = '#6B7280';
      ctx.fillText(location, canvasWidth / 2, 180);
    }

    // QR Code
    const qrImage = await loadImage(qrCodeDataUrl);
    const qrX = (canvasWidth - 400) / 2;
    const qrY = event.location ? 205 : 185;
    ctx.drawImage(qrImage, qrX, qrY, 400, 400);

    // Footer text (monospaced)
    ctx.fillStyle = '#6B7280';
    ctx.font = '16px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Scan to find your photos', canvasWidth / 2, event.location ? 640 : 620);

    // Footer bar (matching header style)
    ctx.fillStyle = '#2563EB'; // Blue
    ctx.fillRect(0, canvasHeight - 80, canvasWidth, 80);

    // Full Event ID at bottom (matching header style)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'center';
    // Split ID into two lines if too long
    if (id.length > 36) {
      const midPoint = Math.floor(id.length / 2);
      const line1 = id.substring(0, midPoint);
      const line2 = id.substring(midPoint);
      ctx.fillText(line1, canvasWidth / 2, canvasHeight - 50);
      ctx.fillText(line2, canvasWidth / 2, canvasHeight - 25);
    } else {
      ctx.fillText(id, canvasWidth / 2, canvasHeight - 40);
    }

    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png');

    // Upload to S3
    const s3Key = `qr-codes/${id}.png`;
    const uploadResult = await uploadToS3({
      key: s3Key,
      body: buffer,
      contentType: 'image/png',
    });

    if (!uploadResult.success) {
      console.error('S3 upload failed:', uploadResult.error);
      return NextResponse.json(
        { error: 'Failed to upload QR code to S3', details: uploadResult.error },
        { status: 500 }
      );
    }

    // Update event with QR code URL (S3 path)
    const updateResult = await client.models.Event.update({
      id,
      qrCodeUrl: s3Key, // Store the S3 key instead of full URL
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
      s3Key,
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
