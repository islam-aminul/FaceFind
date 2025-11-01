import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import '@/lib/amplify-config';
import { s3Service } from '@/lib/aws/s3';

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get event to retrieve QR code S3 key
    const eventResult = await client.models.Event.get({ id });

    if (eventResult.errors || !eventResult.data) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const event = eventResult.data;

    if (!event.qrCodeUrl) {
      return NextResponse.json(
        { error: 'QR code not generated yet' },
        { status: 404 }
      );
    }

    // Check if qrCodeUrl is a full URL (old format) or S3 key (new format)
    let presignedUrl: string;

    if (event.qrCodeUrl.startsWith('http')) {
      // Old format - full URL, return as is (though it won't work for private buckets)
      // Suggest regenerating QR code
      return NextResponse.json(
        { error: 'QR code needs to be regenerated. Please click "Generate QR Code" again.' },
        { status: 400 }
      );
    } else {
      // New format - S3 key, generate presigned URL
      presignedUrl = await s3Service.getPresignedUrl(event.qrCodeUrl, 3600);
    }

    return NextResponse.json({
      success: true,
      url: presignedUrl,
      expiresIn: 3600,
    });
  } catch (error: any) {
    console.error('QR code download error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get QR code download URL' },
      { status: 500 }
    );
  }
}
