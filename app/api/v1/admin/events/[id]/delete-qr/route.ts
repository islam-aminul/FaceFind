import { NextRequest, NextResponse } from 'next/server';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import '@/lib/amplify-config';
import { S3Service } from '@/lib/aws/s3';

const client = generateClient<Schema>({
  authMode: 'apiKey',
});

export async function DELETE(
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
        { success: true, message: 'No QR code to delete' },
        { status: 200 }
      );
    }

    // Delete from S3 if it's an S3 key (not a full URL)
    if (!event.qrCodeUrl.startsWith('http')) {
      try {
        const s3Service = new S3Service();
        await s3Service.deleteFile(event.qrCodeUrl);
      } catch (s3Error) {
        console.error('Failed to delete QR code from S3:', s3Error);
        // Continue to update database even if S3 delete fails
      }
    }

    // Update event to remove QR code URL
    const updateResult = await client.models.Event.update({
      id,
      qrCodeUrl: null,
    });

    if (updateResult.errors) {
      console.error('Failed to update event:', updateResult.errors);
      return NextResponse.json(
        { error: 'Failed to remove QR code reference from event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'QR code deleted successfully',
    });
  } catch (error: any) {
    console.error('QR code deletion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete QR code' },
      { status: 500 }
    );
  }
}
